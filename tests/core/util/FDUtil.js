import path from "path"
const testData = path.resolve("tests", ".data")

import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)
const { expect } = chai
import FDUtil from "../../../src/core/util/FDUtil.js"
import fs from "fs"

describe("FileUtil", () => {

  describe("fixSlashes", () => {
    it("should replace backslashes with forward slashes", () => {
      const result = FDUtil.fixSlashes("path\\to\\file")
      expect(result).to.equal("path/to/file")
    })

    it("should leave forward slashes untouched", () => {
      const result = FDUtil.fixSlashes("path/to/file")
      expect(result).to.equal("path/to/file")
    })

    it("should replace mixed slashes with forward slashes", () => {
      const result = FDUtil.fixSlashes("path\\to/file\\with/mixed/slashes")
      expect(result).to.equal("path/to/file/with/mixed/slashes")
    })
  })

  describe("resolveFile", () => {
    it("should throw an error for an invalid file", async() => {
      await expect(FDUtil.resolveFile("")).to.be.rejectedWith("Expected string or array of strings")
    })

    it("should throw an error if no file is found", async() => {
      await expect(FDUtil.resolveFile(path.join(testData, "nonexistentfile.txt"))).to.be.rejectedWith(/File not found/)
    })

    it("should resolve a valid file path", async() => {
      const testFile = FDUtil.fixSlashes(path.join(testData, "file1.txt"))
      const result = await FDUtil.resolveFile(testFile)

      expect(result.path).to.include("file1.txt")
      expect(result.name).to.equal("file1.txt")
      expect(result.module).to.equal("file1")
      expect(result.extension).to.equal(".txt")
    })
  })

  describe("getFiles", () => {
    it("should throw an error for invalid input", async() => {
      await expect(FDUtil.getFiles(123)).to.be.rejectedWith(/Invalid glob pattern/)
    })

    it("should return an array of matching files", async() => {
      const pattern = path.join(testData, "*.txt")
      const result = await FDUtil.getFiles(pattern)
      expect(Array.isArray(result)).to.be.true
      expect(result.every(f => typeof f === "object")).to.be.true
      expect(result.length).to.equal(2) // file1.txt and file2.txt
      expect(result.some(f => f.name === "file1.txt")).to.be.true
      expect(result.some(f => f.name === "file2.txt")).to.be.true
    })

    it("should throw an error for an empty pattern", async() => {
      await expect(FDUtil.getFiles("")).to.be.rejectedWith(/Invalid glob pattern/)
    })
  })

  describe("readFile", () => {
    it("should read the content of a file", async() => {
      const testFile = FDUtil.fixSlashes(path.join(testData, "file1.txt"))
      const result = await FDUtil.readFile(await FDUtil.resolveFile(testFile))
      expect(result).to.be.a("string")
      expect(result.length).to.be.greaterThan(0)
    })

    it("should throw an error for an invalid file path", async() => {
      const invalidFile = FDUtil.fixSlashes(path.join(testData, "invalid.txt"))
      await expect(FDUtil.resolveFile(invalidFile)).to.be.rejectedWith(/File not found/)
    })

    it("should throw an error for a non-existent file", async() => {
      const nonexistentFile = FDUtil.fixSlashes(path.join(testData, "nonexistentfile.txt"))
      await expect(FDUtil.resolveFile(nonexistentFile)).to.be.rejectedWith(/File not found/)
    })
  })

  describe("toUri", () => {
    it("should convert a path to a URI", () => {
      const result = FDUtil.toUri("path/to/file")
      expect(result).to.equal("file://path/to/file")
    })

    it("should handle paths with backslashes", () => {
      const result = FDUtil.toUri("path\\to\\file")
      expect(result).to.equal("file://path/to/file")
    })
  })

  describe("mapDir", () => {
    it("should map a directory to a DirMap", () => {
      const dir = "path/to/dir"
      const result = FDUtil.mapDir(dir)
      expect(result).to.have.property("path", dir)
      expect(result).to.have.property("uri", `file://${dir}`)
    })
  })

  describe("resolveDirectory", () => {
    it("should throw an error for an empty path", async() => {
      await expect(FDUtil.resolveDirectory("")).to.be.rejectedWith("Path is required")
    })

    it("should throw an error if no directory is found", async() => {
      await expect(FDUtil.resolveDirectory(path.join(testData, "nonexistentdir"))).to.be.rejectedWith(/Path not found/)
    })
  })

  describe("writeFile", () => {
    it("should throw an error if no absolute path is provided", async() => {
      await expect(FDUtil.writeFile({}, "content")).to.be.rejectedWith("No absolute path in file map")
    })

    it("should write content to a file", async() => {
      const testFile = path.join(testData, "temp-test-write.txt")
      const fileObject = FDUtil.mapFile(testFile)
      const content = "test content"

      await FDUtil.writeFile(fileObject, content)
      const readContent = await fs.promises.readFile(testFile, "utf8")
      expect(readContent).to.equal(content)

      // Cleanup
      await fs.promises.unlink(testFile)
    })
  })

  describe("composeFilename", () => {
    const tempDir = path.join(testData, "temp_compose_test")

    beforeEach(async() => {
      await fs.promises.mkdir(tempDir, { recursive: true })
    })

    afterEach(async() => {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    })

    it("should compose a new file path in a directory", async() => {
      const newFile = "newfile.txt"
      const result = await FDUtil.composeFilename(tempDir, newFile)

      expect(result).to.have.property("name", "newfile.txt")
      expect(result.path).to.include("newfile.txt")
      expect(result.module).to.equal("newfile")
      expect(result.extension).to.equal(".txt")
      expect(result.absolutePath).to.include(tempDir)
    })

    it("should handle nested paths in filename", async() => {
      const newFile = "nested/path/newfile.txt"
      const result = await FDUtil.composeFilename(tempDir, newFile)

      const expectedPath = path.join(tempDir, "nested", "path", "newfile.txt")
      const expectedUri = FDUtil.toUri(expectedPath)
      const expectedAbsolutePath = path.resolve(process.cwd(), expectedPath)
      const expectedAbsoluteUri = FDUtil.toUri(expectedAbsolutePath)

      expect(result.path).to.equal(expectedPath)
      expect(result.uri).to.equal(expectedUri)
      expect(result.absolutePath).to.equal(expectedAbsolutePath)
      expect(result.absoluteUri).to.equal(expectedAbsoluteUri)
      expect(result.name).to.equal("newfile.txt")
      expect(result.module).to.equal("newfile")
      expect(result.extension).to.equal(".txt")
    })
  })

  describe("composeDir", () => {
    const tempParentDir = path.join(testData, "temp_compose_parent")

    beforeEach(async() => {
      await fs.promises.mkdir(tempParentDir, { recursive: true })
    })

    afterEach(async() => {
      await fs.promises.rm(tempParentDir, { recursive: true, force: true })
    })

    it("should compose a new directory path", async() => {
      const newDirPath = path.join(tempParentDir, "newdir")
      const result = await FDUtil.composeDir(newDirPath)

      expect(result).to.have.property("path", newDirPath)
      expect(result).to.have.property("uri", FDUtil.toUri(newDirPath))
    })

    it("should handle nested directory paths", async() => {
      const newDirPath = path.join(tempParentDir, "nested/path/newdir")
      const result = await FDUtil.composeDir(newDirPath)

      expect(result.path).to.equal(newDirPath)
      expect(result.uri).to.equal(FDUtil.toUri(newDirPath))
    })
  })
})
