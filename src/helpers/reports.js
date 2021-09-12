const { withId } = require('../globalOptions');

const XML_INDENT = '  ';

function formatXmlText(text, level) {
  let xmlText = text.trim();

  if (level) {
    xmlText = xmlText.replace(/^|(\n)/, XML_INDENT.repeat(level));
  }

  return xmlText;
}

function generateXml({ tag, attributes, children }, level = 0) {
  const indent = XML_INDENT.repeat(level);

  let xmlAttributes = attributes
    ? ' ' +
      Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')
    : '';

  const childrenStr = children?.length
    ? children.map((child) => (typeof child === 'string' ? formatXmlText(child, level + 1) : generateXml(child, level + 1))).join('\n') +
      '\n'
    : '';

  let xmlStr = `${indent}<${tag}${xmlAttributes}>\n` + childrenStr + `${indent}</${tag}>`;

  if (level === 0) {
    xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlStr;
  }

  return xmlStr;
}

function generateJunitReport({ totalDuration, id, packageResults }) {
  const totalSeconds = totalDuration / 1000;
  let totalFailures = 0;

  const suitesXml = packageResults.map(({ name, duration, shortMessage, failed, timedOut, stderr }) => {
    const seconds = duration / 1000;
    const packageTag = withId(id, name);
    const failures = failed || timedOut ? 1 : 0;
    totalFailures += failures;

    return {
      tag: 'testsuite',
      attributes: {
        name: packageTag,
        tests: 1,
        skipped: 0,
        errors: 0,
        failures,
        time: totalSeconds,
      },
      children: [
        {
          tag: 'testcase',
          attributes: { name: packageTag, classname: packageTag, time: seconds },
          children: failures ? [{ tag: 'failure', attributes: { message: shortMessage }, children: [stderr] }] : [],
        },
      ],
    };
  });

  return generateXml({
    tag: 'testsuites',
    attributes: {
      name: id || '',
      tests: suitesXml.length,
      failures: totalFailures,
      time: totalSeconds,
    },
    children: suitesXml,
  });
}

module.exports = {
  generateJunitReport,
};
