/**
 * From @lerna/listable
 */
function parseViewOptions(options) {
  const alias = options._[0];

  return {
    showAll: alias === 'la' || options.all,
    showLong: alias === 'la' || alias === 'll' || options.long,
    showJSON: options.json,
    showNDJSON: options.ndjson,
    showParseable: options.parseable,
    isTopological: options.toposort,
    showGraph: options.graph,
  };
}

function parseListableResult({ result, options, packageGraph }) {
  const text = result?.text?.trim() || '';

  if (!text) {
    return [];
  }

  const viewOptions = parseViewOptions(options);

  const getPkg = (pkgName) => packageGraph.get(pkgName).pkg;

  if (viewOptions.showJSON) {
    return JSON.parse(text).map((pkg) => getPkg(pkg.name));
  } else if (viewOptions.showNDJSON) {
    const jsonLines = text.split('\n');
    return jsonLines.map((line) => {
      const pkgName = JSON.parse(line).name;
      return getPkg(pkgName);
    });
  } else if (viewOptions.showParseable) {
    const lines = text.split('\n');

    if (viewOptions.showLong) {
      return lines.map((line) => {
        const [, pkgName] = line.match(/.+:([^:]+):[^:]+\.[^:]+\.[^:]+(?::PRIVATE)?$/);
        return getPkg(pkgName);
      });
    } else {
      const locationSet = new Set(lines);
      return packageGraph.rawPackageList.filter((pkg) => locationSet.has(pkg.location));
    }
  } else if (viewOptions.showGraph) {
    const json = JSON.parse(text);
    return Object.keys(json).map(getPkg);
  } else {
    const lines = text.split('\n');
    return lines.map((line) => {
      const [, pkgName] = line.match(/^([^\s]+)/) || [];
      return getPkg(pkgName);
    });
  }
}

module.exports = {
  parseListableResult,
};
