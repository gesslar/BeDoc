export default class ValidUtil {
  string = (str, nonEmpty = false) => typeof str === "string" && (nonEmpty ? str.length > 0 : true);
  array = (arr, nonEmpty = false) => Array.isArray(arr) && (nonEmpty ? arr.length > 0 : true);
  arrayUniform = (arr, type, nonEmpty = false) => Array.isArray(arr) && arr.every(item => typeof item === type) && (nonEmpty ? arr.length > 0 : true);
}
