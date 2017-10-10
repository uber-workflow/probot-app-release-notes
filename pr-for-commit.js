const fetch = require('node-fetch');

async function fetchPrForCommit(repo, sha) {
  const res = await fetch(`https://github.com/${repo}/branch_commits/${sha}`);
  if (res.ok) {
    return findPull(await res.text());
  } else {
    throw new Error(res.statusText);
  }
}

const mergedRegex = /<li class="pull-request">\((?:.+?)(\d+)<\/a>\)\<\/li>/;

function findPull(res) {
  const pr = res.match(mergedRegex);
  if (pr) {
    return parseInt(pr[1], 10);
  }
}

module.exports = fetchPrForCommit;
