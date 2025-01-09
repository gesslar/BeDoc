import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)
const { expect } = chai

import DataUtil from "../../../src/core/util/DataUtil.js"

describe("DataUtil", () => {
  describe("uniformArray", () => {
    it("should return true for array of strings", () => {
      expect(DataUtil.uniformArray(["a", "b", "c"], "string")).to.be.true
    })

    it("should return true for array of numbers", () => {
      expect(DataUtil.uniformArray([1, 2, 3], "number")).to.be.true
    })

    it("should return false for mixed types", () => {
      expect(DataUtil.uniformArray(["a", 1, "b"], "string")).to.be.false
    })

    it("should return true for empty array", () => {
      expect(DataUtil.uniformArray([], "string")).to.be.true
    })
  })

  describe("clone", () => {
    it("should create a deep copy of an object", () => {
      const original = { a: 1, b: { c: 2 } }
      const cloned = DataUtil.clone(original)
      expect(cloned).to.deep.equal(original)
      expect(cloned).to.not.equal(original)
      expect(cloned.b).to.not.equal(original.b)
    })

    it("should freeze object when specified", () => {
      const original = { a: 1, b: { c: 2 } }
      const frozen = DataUtil.clone(original, true)
      expect(Object.isFrozen(frozen)).to.be.true
    })

    it("should handle arrays", () => {
      const original = [1, [2, 3], { a: 4 }]
      const cloned = DataUtil.clone(original)
      expect(cloned).to.deep.equal(original)
      expect(cloned).to.not.equal(original)
      expect(cloned[1]).to.not.equal(original[1])
    })

    it("should handle null and undefined values", () => {
      const original = { a: null, b: undefined }
      const cloned = DataUtil.clone(original)
      expect(cloned).to.deep.equal({ a: null })
    })
  })

  describe("allocate", () => {
    it("should create object from arrays", () => {
      const result = DataUtil.allocateObject(["a", "b"], ["x", "y"])
      expect(result).to.deep.equal({ a: "x", b: "y" })
    })

    it("should handle function spec", () => {
      const result = DataUtil.allocateObject(["test"], _ => [{}])
      expect(result).to.deep.equal({ test: {} })
    })

    it("should convert numeric keys to strings", () => {
      const result = DataUtil.allocateObject([1, 2], ["a", "b"], true)
      expect(result).to.deep.equal({ "1": "a", "2": "b" })
    })

    it("should throw error for non-array source", () => {
      expect(() => DataUtil.allocateObject("not an array", [])).to.throw("Source must be an array")
    })

    it("should throw error for invalid spec", () => {
      expect(() => DataUtil.allocateObject([], "not array or function")).to.throw("Spec must be an array or a function")
    })

    it("should throw error for mismatched lengths", () => {
      expect(() => DataUtil.allocateObject(["a", "b"], ["x"])).to.throw("Source and spec must have the same number of elements")
    })

    it("should throw error for non-string keys without force conversion", () => {
      expect(() => DataUtil.allocateObject([1], ["x"], false)).to.throw("Indices of an Object must be of type string")
    })

    it("should handle spec function returning array", () => {
      const result = DataUtil.allocateObject(["a", "b"], arr => arr.map(k => k.toUpperCase()))
      expect(result).to.deep.equal({ a: "A", b: "B" })
    })

    it("should throw error for spec function not returning array", () => {
      expect(() => DataUtil.allocateObject(["a"], _ => "not an array")).to.throw("Spec resulting from function must be an array")
    })
  })
})
