/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// NOTE: prevailing assumption is a release's target_commitish is always a SHA.

const generateChangelog = require('./generate-changelog');
const generateMigrationGuide = require('./generate-migration-guide');

const releasesForCommit = require('./releases-for-commit');
const prForCommit = require('./pr-for-commit');

module.exports = robot => {
  robot.on('release', handler);

  robot.on('pull_request.edited', update);
  robot.on('pull_request.labeled', update);
  robot.on('pull_request.unlabeled', update);

  async function handler(context) {
    const release = context.payload.release;

    // Don't generate release notes for prereleases
    if (release.prerelease) {
      return;
    }

    const releasesBySha = await fetchAllReleases(context);

    const {commits} = await getChangeInfo(
      context,
      release.target_commitish,
      releasesBySha,
      [release.target_commitish],
    );
    const body = await notesForCommits(context, commits);

    updateRelease(context, release, body);
  }

  async function update(context) {
    const pr = context.payload.pull_request;
    if (!pr.merged) {
      return;
    }

    const repo = context.payload.repository.full_name;
    const releases = await releasesForCommit(repo, pr.merge_commit_sha);

    const {releasesBySha, tagShas} = await getReleaseInfo(context, releases);

    const {commits, release} = await getChangeInfo(
      context,
      pr.merge_commit_sha,
      releasesBySha,
      tagShas,
    );
    const body = await notesForCommits(context, commits);

    updateRelease(context, release, body);
  }
};

async function updateRelease(context, release, body) {
  const {github} = context;
  github.repos.editRelease(
    context.repo({
      id: release.id,
      tag_name: release.tag_name,
      body,
    }),
  );
}

// fetches all releases
// also finds releases corresponding to provided tags
async function getReleaseInfo(context, childTags) {
  const tagShas = [];

  const releasesBySha = await fetchAllReleases(context, release => {
    if (childTags.has(release.tag_name)) {
      // put in reverse order
      // later releases come first,
      // but we want to iterate beginning oldest releases first
      tagShas.unshift(release.target_commitish);
      // tagSha.push(release.target_commitish);
    }
  });

  return {releasesBySha, tagShas};
}

async function fetchAllReleases(context, handler = () => {}) {
  const {github} = context;

  const releasesBySha = new Map();

  const req = github.repos.getReleases(
    context.repo({
      per_page: 100,
    }),
  );
  await fetchPages(github, req, results => {
    results.data.forEach(release => {
      if (release.prerelease) {
        // Ignore prereleases, so changelog reflects changes since last non-prerelease
        return;
      }
      releasesBySha.set(release.target_commitish, release);
      handler(release);
    });
  });
  return releasesBySha;
}

async function getChangeInfo(
  context,
  commitShaInReleaseOrChildReleaseCommitSha,
  releaseCommits,
  pertinentReleaseCommits,
) {
  const loadedCommits = new Map();

  for (const sha of pertinentReleaseCommits) {
    if (loadedCommits.has(sha)) {
      // skip this commit if visited already
      continue;
    }

    const done = await fetchRelevantCommits(
      context,
      loadedCommits,
      sha,
      releaseCommits,
      commitShaInReleaseOrChildReleaseCommitSha,
    );

    if (done) {
      return {
        commits: buildCommits(
          loadedCommits,
          done.releaseSha,
          done.parentReleaseSha,
        ),
        release: releaseCommits.get(done.releaseSha),
      };
    }
  }
}

async function notesForCommits(context, commits) {
  const {github} = context;
  const repo = context.payload.repository.full_name;
  const prs = await Promise.all(commits.map(sha => prForCommit(repo, sha)));

  const issues = await Promise.all(
    prs.filter(Boolean).map(number =>
      github.issues.get(
        context.repo({
          number,
        }),
      ),
    ),
  );

  let changes = issues.map(issue => ({
    labels: issue.data.labels,
    title: issue.data.title,
    number: issue.data.number,
    url: issue.data.html_url,
  }));

  const config = await context.config('release-notes.yml', {
    labels: [
      'security',
      'breaking',
      'interface',
      'bugfix',
      'dependencies',
      'performance',
    ],
    ignore: ['release'],
  });

  changes = changes.filter(change => {
    return !change.labels.some(label => config.ignore.includes(label.name));
  });

  const prNums = changes.reduce((acc, change) => {
    return acc.add(change.number);
  }, new Set());

  const changelog = generateChangelog(changes, config.labels);
  const guide = await generateMigrationGuide(context, prNums);

  return [
    '## Changelog',
    changelog,
    ...(guide ? ['## Migration Guide', guide] : []),
  ].join('\n');
}

function buildCommits(commitsBySha, releaseSha, prevReleaseSha) {
  const commits = [];
  let nextSha = releaseSha;
  while (nextSha !== prevReleaseSha) {
    const commit = commitsBySha.get(nextSha);
    commits.push(commit.sha);
    if (commit.parents.length > 1) {
      throw new Error(`commit has ${commit.sha} multiple parents`);
    }
    nextSha = commit.parents.length === 0 ? void 0 : commit.parents[0].sha;
  }
  return commits;
}

async function fetchRelevantCommits(
  context,
  commitCache,
  sha,
  releaseCommits,
  commitShaInReleaseOrChildReleaseCommitSha,
) {
  if (commitCache.has(sha)) {
    return; // return early
  }

  const {github} = context;

  let nearestDescendantReleaseSha = sha;

  let req = github.repos.getCommits(
    context.repo({
      sha,
      per_page: 100,
    }),
  );

  let releaseSha;
  let parentReleaseSha;

  // todo: verify no two releases target same commit hash

  await fetchPages(github, req, commits => {
    for (let commit of commits.data) {
      if (commitCache.has(commit.sha)) {
        // break out of loop if we've already encountered this commit.
        // hence as we have already visited all parents
        return true;
      }
      commitCache.set(commit.sha, commit);
      if (commit.sha === commitShaInReleaseOrChildReleaseCommitSha) {
        releaseSha = nearestDescendantReleaseSha;
      } else {
        if (releaseCommits.has(commit.sha)) {
          nearestDescendantReleaseSha = commit.sha;
          if (releaseSha) {
            if (commit.sha !== releaseSha) {
              // set parent release
              parentReleaseSha = commit.sha;
            }
            // exit now
            return true;
          }
        }
      }
    }
  });

  if (!releaseSha) {
    throw new Error('Unexpected state');
  }

  return {
    releaseSha,
    parentReleaseSha,
  };
}

async function fetchPages(github, pageReq, pageHandler) {
  while (pageReq) {
    const page = await pageReq;
    const stopEarly = await pageHandler(page);
    pageReq =
      !stopEarly && github.hasNextPage(page)
        ? github.getNextPage(page)
        : void 0;
  }
}
