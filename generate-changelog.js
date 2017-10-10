module.exports = function generateChangelog(changes, labelWeight) {
  const indexed = indexByWeight(changes, labelWeight);

  const [weighted, nonweighted] = partitionMap(
    indexed,
    ([weight]) => weight > 0,
  );

  let lines = [];

  if (weighted.length) {
    lines.push('### Highlighted Changes');
    for (let [key, value] of weighted) {
      lines.push(changeSection(value.labels));

      for (change of value.changes) {
        lines.push(changeItem(change, true));
      }
    }
  }

  if (nonweighted.length) {
    lines.push('');
    lines.push('### Other Changes');
    for (let [key, value] of nonweighted) {
      for (change of value.changes) {
        lines.push(changeItem(change, false));
      }
    }
  }

  return lines.join('\n');
};

function partitionMap(map, filter) {
  return filterMap(map, [filter, (...args) => !filter(...args)]);
}

function filterMap(map, filters) {
  return filters.map(filter => Array.from(map.entries()).filter(filter));
}

/**
 * Calculates the weight of a given array of labels
 */
function getWeight(labels, labelWeight) {
  const places = labels.map(label => labelWeight.indexOf(label.name));
  let binary = '';
  for (let i = 0; i < labelWeight.length; i++) {
    binary += places.includes(i) ? '1' : '0';
  }
  return parseInt(binary, 2);
}

function indexByWeight(changes, labelWeight) {
  const index = new Map();
  for (change of changes) {
    const weight = getWeight(change.labels, labelWeight);
    if (!index.has(weight)) {
      index.set(weight, {changes: new Set(), labels: change.labels});
    }
    index.get(weight).changes.add(change);
  }
  return index;
}

function changeSection(labels) {
  return `<div>${labels
    .map(label => `<img src="${labelImage(label)}"/>`)
    .join(' ')}</div>\n`;
}

function changeItem(pr, indent = false) {
  return `${indent ? '  ' : ''}- ${pr.title} ([#${pr.number}](${pr.url}))`;
}

function labelImage({color, name}) {
  return `https://gh-label-svg.now.sh/label.svg?color=%23${color}&text=${name}`;
}

// console.log(generateChangelog());
