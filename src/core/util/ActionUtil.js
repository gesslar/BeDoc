export default {
  actionTypes: Object.freeze(["parse", "print"]),
  actionMetaRequirements: Object.freeze({
    parse: [{action: "parse"}, "language"],
    print: [{action: "print"}, "format"],
  })
}
