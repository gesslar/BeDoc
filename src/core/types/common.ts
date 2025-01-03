/**
 * Common response type for operations that can succeed or fail
 */
export type BaseResponse = {
  status: "success" | "error";
  message?: string;
};
