import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
import { globby } from 'globby';
import FileUtil from './fd.js';

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
      await expect(fileUtil.resolveFile('nonexistentfile.txt')).to.be.rejectedWith(/File not found/);
    });

    it('should resolve a valid file path', async () => {
      const mockFile = 'mockfile.txt';
      const mockPath = `D:/${mockFile}`;

      fileUtil.getFiles = async () => new Set([mockPath]);
      const result = await fileUtil.resolveFile(mockFile);

      expect(result.get('path')).to.equal(mockPath);
      expect(result.get('name')).to.equal(mockFile);
      expect(result.get('module')).to.equal('mockfile');
    });
  });

  describe('getFiles', () => {
    it('should throw an error for invalid input', async() => {
      await expect(fileUtil.getFiles(123)).to.be.rejectedWith(/Invalid glob pattern/);
    });

    it('should return a set of matching files', async () => {
      const pattern = "test/*.txt";
      const mockResults = await globby(pattern);
      const mockResultsSet = new Set(mockResults);

      const result = await fileUtil.getFiles(pattern);
      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.equal(mockResultsSet.size); // Compare Set sizes
    });

    it('should throw an error for an empty pattern', async() => {
      await expect(fileUtil.getFiles('')).to.be.rejectedWith(/Invalid glob pattern/);
    });
  });

  describe('readFile', () => {
    it('should read the content of a file', async() => {
      const mockContent = 'File content';
      const mockFilePath = 'mockfile.txt';

      fileUtil.resolveFile = async() => {
        return new Map([['path', mockFilePath]]);
      };

      fileUtil.readFile = async() => mockContent;
      const result = await fileUtil.readFile(mockFilePath);
      expect(result).to.equal(mockContent);
    });

    it('should throw an error for an invalid file path', async() => {
      await expect(fileUtil.readFile('invalid.txt')).to.be.rejectedWith(/File not found/);
    });

    it('should throw an error for a non-existent file', async() => {
      await expect(fileUtil.readFile('nonexistentfile.txt')).to.be.rejectedWith(/File not found/);
    });
  });
});
