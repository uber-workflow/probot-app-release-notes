/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const pattern = /(\d{5})\.md/;

module.exports = async function generateMigrationGuide(context, prs) {
  const {github} = context;

  let migrations;
  try {
    migrations = await github.repos.getContent(
      context.repo({
        path: 'docs/migrations',
      }),
    );
  } catch (err) {
    if (err.code === 404) {
      return '';
    } else {
      throw new Error('unexpected error getting docs/migrations');
    }
  }

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
