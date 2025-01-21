/**
 * Emit a signal to all objects that have registered a slot for
 * the signal.
 *
 * @param {int} sig - The signal number.
 * @param {mixed} arg - The arguments to pass to the signal (optional).
 */
void emit(int sig, mixed arg...) {}

/**
 * Register a slot for a signal.
 *
 * @param {int} sig - The signal number.
 * @param {string} func - The function to call when the signal is emitted.
 * @return {int} - `SIG_SLOT_OK` if the slot was registered successfully.
 *                 See `include/signal.h` for other return values.
 */
int slot(int sig, string func) {}

/**
 * Unregister a slot for a signal.
 *
 * @param {int} sig - The signal number.
 * @return {int} - `SIG_SLOT_OK` if the slot was unregistered successfully.
 *                 See `include/signal.h` for other return values.
 */
int unslot(int sig) {}

/**
 * Get the signal daemon object.
 *
 * @return {object} - The signal daemon object.
 */
object signal_d() {}
