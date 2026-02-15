import {Data} from "@gesslar/toolkit"

export default Data.deepFreezeObject({
  actionTypes: ["parse", "print"],
  actionMetaRequirements: {
    parse: [{kind: "parse"}, "input"],
    print: [{kind: "print"}, "format"],
  },
})
