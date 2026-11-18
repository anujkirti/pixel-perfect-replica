// REPLACE WITH REAL RESULTS
export const confusionMatrix = {
  labels: ["firearm", "knife", "background"],
  baseline: [
    [1082, 20, 98],
    [24, 1102, 74],
    [215, 169, 9616],
  ],
  tuned: [
    [1044, 9, 147],
    [12, 1044, 144],
    [17, 14, 9969],
  ],
  extended: {
    baseline: [
      [58, 10, 352],
      [52, 5, 453],
      [15, 44, 321],
      [12, 9, 269],
    ],
    tuned: [
      [4, 1, 415],
      [3, 1, 506],
      [1, 5, 374],
      [1, 1, 288],
    ],
  },
};
