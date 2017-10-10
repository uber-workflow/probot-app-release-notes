const fetch = require('node-fetch');

function buildRegex(repo) {
  return new RegExp(
    `<a href="\\/${repo}\\/releases\\/tag\\/([\\s\\S]+?)">`,
    'g',
  );
}

async function fetchReleasesForCommit(repo, sha) {
  const res = await fetch(`https://github.com/${repo}/branch_commits/${sha}`);
  if (res.ok) {
    const regex = buildRegex(repo);
    const tags = new Set();
    const text = await res.text();

    let match;
    while ((match = regex.exec(text))) {
      tags.add(match[1]);
    }

    return tags;
  } else {
    throw new Error(res.statusText);
  }
}

module.exports = fetchReleasesForCommit;
