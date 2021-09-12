function getSmallestIndex(numberArr) {
  return numberArr.reduce(
    (currSmallestIndex, currentValue, currentIndex) => (numberArr[currSmallestIndex] > currentValue ? currentIndex : currSmallestIndex),
    0
  );
}

function splitEvenly(items, { nodeTotal, nodeIndex }) {
  const minChunkSize = Math.floor(items.length / nodeTotal);

  let remaining = items.length % nodeTotal; //?
  let start = 0;

  for (let i = 0; i < nodeIndex; i++) {
    let nodeChunkSize = minChunkSize;

    if (remaining) {
      remaining--;
      nodeChunkSize++;
    }

    start += nodeChunkSize;
  }

  const end = start + minChunkSize + (remaining ? 1 : 0);
  return items.slice(start, end);
}

function splitByTimings(packageTags, timings, { nodeTotal, nodeIndex }) {
  const remainingTagsSet = new Set(packageTags);
  const filteredTimings = [];

  for (const timing of timings) {
    if (remainingTagsSet.has(timing.classname)) {
      filteredTimings.push(timing);
      remainingTagsSet.delete(timing.classname);
    }
  }

  const missingTags = Array.from(remainingTagsSet || []);

  // sort timings and distribute from fastest to slowest
  const remaining = [...filteredTimings].sort((a, b) => a.run_time - b.run_time);
  const allNodeTags = [];
  const allNodeDurations = [];

  // make one pass across all nodes and assign the slowest task
  for (let i = 0; i < nodeTotal; i++) {
    allNodeTags[i] = [];
    allNodeDurations[i] = 0;

    const timing = remaining.pop();
    if (timing) {
      allNodeTags[i].push(timing.classname);
      allNodeDurations[i] += timing.run_time || 0;
    }
  }

  const addToFastestNode = (tag, duration) => {
    const fastestNodeIndex = getSmallestIndex(allNodeDurations);
    allNodeTags[fastestNodeIndex].push(tag);
    allNodeDurations[fastestNodeIndex] += duration;
  };

  // loop through remaining timings and add them to the node with the shortest total duration
  while (remaining.length > 0) {
    const timing = remaining.pop();
    addToFastestNode(timing.classname, timing.run_time);
  }

  // if there are missing tags, do the same thing and estimate the run time as the filtered average
  if (missingTags.length) {
    const totalDuration = filteredTimings.reduce((total, timing) => (total += timing.run_time), 0);
    const averageDuration = totalDuration / filteredTimings.length || 1;
    missingTags.forEach((tag) => addToFastestNode(tag, averageDuration));
  }

  return { result: allNodeTags[nodeIndex], missingTags };
}

module.exports = {
  splitEvenly,
  splitByTimings,
};
