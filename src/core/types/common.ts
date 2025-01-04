/**
 * Common response type for operations that can succeed or fail
 */

export type Status = "success" | "error";

export type BaseResponse = {
  status: Status;
  message?: string;
};
