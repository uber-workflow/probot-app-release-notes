const path = require('path');

const pattern = /(\d{5})\.md/;

module.exports = async function generateMigrationGuide(context, prs) {
  const {github} = context;

  const migrations = await github.repos.getContent(
    context.repo({
      path: 'docs/migrations',
    }),
  );

  const files = migrations.data.filter(file => {
    if (file.type === 'file') {
      const results = file.name.match(pattern);
      if (results) {
        const number = parseInt(results[1], 10);
        return prs.has(number);
      }
    }
  });

  const contents = await Promise.all(
    files.map(file =>
      github.repos.getContent(
        context.repo({
          path: file.path,
        }),
      ),
    ),
  );

  return contents
    .map(res => Buffer.from(res.data.content, 'base64').toString())
    .join('\n');
};
