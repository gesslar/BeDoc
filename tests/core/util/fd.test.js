import path from 'path';
const testData = path.resolve("tests", '.data');

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
import FileUtil from '../../../src/core/util/fd.js';

describe('FileUtil', () => {
  let fileUtil;

  beforeEach(() => {
    fileUtil = new FileUtil();
  });

  describe('fixSlashes', () => {
    it('should replace backslashes with forward slashes', () => {
      const result = fileUtil.fixSlashes('path\\to\\file');
      expect(result).to.equal('path/to/file');
    });

    it('should leave forward slashes untouched', () => {
      const result = fileUtil.fixSlashes('path/to/file');
      expect(result).to.equal('path/to/file');
    });

    it('should replace mixed slashes with forward slashes', () => {
      const result = fileUtil.fixSlashes('path\\to/file\\with/mixed/slashes');
      expect(result).to.equal('path/to/file/with/mixed/slashes');
    });
  });

  describe('resolveFile', () => {
    it('should throw an error for an invalid file', async() => {
      await expect(fileUtil.resolveFile('')).to.be.rejectedWith('File is required');
    });

    it('should throw an error if no file is found', async() => {
      await expect(fileUtil.resolveFile(path.join(testData, 'nonexistentfile.txt'))).to.be.rejectedWith(/File not found/);
    });

    it('should resolve a valid file path', async () => {
      const testFile = fileUtil.fixSlashes(path.join(testData, 'file1.txt'));
      const result = await fileUtil.resolveFile(testFile);

      expect(result.path).to.include('file1.txt');
      expect(result.name).to.equal('file1.txt');
      expect(result.module).to.equal('file1');
      expect(result.extension).to.equal('.txt');
    });
  });

  describe('getFiles', () => {
    it('should throw an error for invalid input', async() => {
      await expect(fileUtil.getFiles(123)).to.be.rejectedWith(/Invalid glob pattern/);
    });

    it('should return an array of matching files', async () => {
      const pattern = path.join(testData, '*.txt');
      const result = await fileUtil.getFiles(pattern);
      expect(Array.isArray(result)).to.be.true;
      expect(result.length).to.equal(2); // file1.txt and file2.txt
      expect(result.some(f => f.includes('file1.txt'))).to.be.true;
      expect(result.some(f => f.includes('file2.txt'))).to.be.true;
    });

    it('should throw an error for an empty pattern', async() => {
      await expect(fileUtil.getFiles('')).to.be.rejectedWith(/Invalid glob pattern/);
    });
  });

  describe('readFile', () => {
    it('should read the content of a file', async() => {
      const testFile = fileUtil.fixSlashes(path.join(testData, 'file1.txt'));
      const result = await fileUtil.readFile(await fileUtil.resolveFile(testFile));
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
    });

    it('should throw an error for an invalid file path', async() => {
      const invalidFile = fileUtil.fixSlashes(path.join(testData, 'invalid.txt'));
      await expect(fileUtil.resolveFile(invalidFile)).to.be.rejectedWith(/File not found/);
    });

    it('should throw an error for a non-existent file', async() => {
      const nonexistentFile = fileUtil.fixSlashes(path.join(testData, 'nonexistentfile.txt'));
      await expect(fileUtil.resolveFile(nonexistentFile)).to.be.rejectedWith(/File not found/);
    });
  });
});
