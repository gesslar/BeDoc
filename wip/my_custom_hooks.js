module.exports = new Map([
  ["print", new Map([
    ["enter", ({name, section, meta}) => {
      section.name = `[${section.name}]`;
    }]
  ])],
]);
