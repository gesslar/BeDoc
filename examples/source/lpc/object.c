/**
 * Retrieves the unique object ID of the given object.
 *
 * @param {object} ob - The object to get the ID of.
 * @return {int} - The unique object ID.
 */
int getoid(object ob) {}

/*
//      get_object() and get_objects()
//      Created by Pallando@Ephemeral Dale   (92-06)
//      Created by Watcher@TMI  (92-09-27)
//      Revised by Watcher and Pallando (92-12-11)
//      Re-written by Pallando (92-12-18)
//      get_objects() added by Pallando@Tabor (93-03-02)
//      "s", "c" & ">" added by Grendel@TMI-2 (93-07-14)
//
//      Use all possible methods to locate an object by the inputed
//      name and return the object pointer if located.
// Ideas for future expansion (please, anyone feel free to add them if they
//                             have the time)
//   "wizards" - the subset of "users" who are wizards.
//   "livings" - all living objects
//   "objects" - all loaded objects
//   check the capitalized and lower_case version of str
//   check wizard's home directories.
*/

/**
 * Attempts to locate an object by the given name and returns the
 * object pointer if found.
 *
 * @param {string} str - The name of the object to locate.
 * @param {object} player - The player object to use as a reference for searching (optional).
 * @return {object} - The located object, or 0 if not found.
 */
varargs object get_object(string str, object player) {}

/**
 * Locates objects based on the specified search string, which can
 * include various search criteria and options.
 *
 * @param {string} str - The search string specifying the objects to locate.
 * @param {object} player - The player object to use as a reference for searching.
 * @param {int} no_arr - If specified, only a single object or 0 will be returned,
 *                       otherwise an array of objects may be returned (optional).
 * @return {mixed} - The located object(s), or 0 if not found.
 */
varargs mixed get_objects(string str, object player, int no_arr) {}

/**
 * Searches for an object within a container or environment
 * using the specified criteria.
 *
 * @param {mixed} ob - The object or name of the object to find.
 * @param {mixed} cont - The container or environment to search within (optional, default: previous object).
 * @param {function} f - An optional function to further filter the search (optional).
 * @return {object} - The found object, or 0 if not found.
 */
varargs object find_ob(mixed ob, mixed cont, function f) {}

/**
 * Retrieves the top-level environment of the specified object,
 * traversing up through nested environments.
 *
 * @param {object} ob - The object to get the top-level environment of.
 * @return {object} - The top-level environment of the object.
 */
object top_environment(object ob) {}

/**
 * Retrieves all environments of the specified object, traversing
 * up through nested environments.
 *
 * @param {object} ob - The object to get the environments of.
 * @return {object[]} - An array of environments of the object.
 */
object *all_environment(object ob) {}

/**
 * Retrieves all living objects present in the specified room.
 *
 * @param {object} room - The room to search for living objects in.
 * @return {object[]} - An array of living objects present in the room.
 */
object *present_livings(object room) {}

/**
 * Retrieves all player objects present in the specified room.
 *
 * @param {object} room - The room to search for player objects in.
 * @return {object[]} - An array of player objects present in the room.
 */
object *present_players(object room) {}

/**
 * Retrieves all non-player characters (NPCs) present in the
 * specified room.
 *
 * @param {object} room - The room to search for NPCs in.
 * @return {object[]} - An array of NPC objects present in the room.
 */
object *present_npcs(object room) {}

/**
 * Locates a living object by the specified name within the
 * specified room.
 *
 * @param {string} name - The name of the living object to locate.
 * @param {object} room - The room to search for the living object in.
 * @return {object} - The located living object, or 0 if not found.
 */
object get_living(string name, object room) {}

/**
 * Locates living objects by the specified names within the
 * specified room.
 *
 * @param {string|string[]} names - The name of the living objects to locate.
 * @param {object} room - The room to search for the living objects in.
 * @return {object[]} - An array of located living objects.
 */
object *get_livings(mixed names, object room) {}

/**
 * Locates a player object by the specified name within the
 * specified room.
 *
 * @param {string} name - The name of the player to locate.
 * @param {object} room - The room to search for the player in.
 * @return {object} - The located player object, or 0 if not found.
 */
object get_player(string name, object room) {}

/**
 * Locates player objects by the specified names within the
 * specified room.
 *
 * @param {string|string[]} names - The name of the player objects to locate.
 * @param {object} room - The room to search for the player objects in.
 * @return {object[]} - An array of located player objects.
 */
object *get_players(mixed names, object room) {}

/**
 * Returns the body of the current interactive user. It is used as a
 * replacement for this_player().
 *
 * @return {object} - The body of the current calling player.
 */
object this_body() {}

/**
 * Returns the object that called the current operation. This may be
 * this_body(), but it may also be a shadow another player who initiated
 * the chain. For example, a wizard using the force command.
 *
 * Be careful with this one, you don't want to accidentally
 * perform operations on the wrong object.
 *
 * @return {object} - The object that called the current operation.
 */
object this_caller() {}

/**
 * Retrieves all clones of the specified file present in the
 * specified container. If the file is an object, it will
 * retrieve all clones using the object's base name.
 *
 * @param {mixed} file - The file or object to find clones of.
 * @param {object} container - The container to search within.
 * @return {object[]} - An array of clones of the specified file present in
 *                      the container.
 */
object *present_clones(mixed file, object container) {}

/**
 * Returns 1 if the caller of the current operation is the specified
 * object, or if the caller is the object with the specified file name.
 *
 * *NOTE* This will not succeed when called from other functions in the
 * simul_efun object, as previous_object() does not count the object
 * itself in its call list.
 *
 * @param {mixed} ob - The object or file name to compare the caller to.
 * @return {int} - 1 if the caller is the specified object, 0 otherwise.
 */
int caller_is(mixed ob) {}

/**
 * Returns 1 if the two objects are in the same environment, or 0 if
 * they are not.
 *
 * @param {object} one - The first object to compare.
 * @param {object} two - The second object to compare.
 * @param {int} top_env - Whether to check the top-level environment (optional).
 * @return {int} - 1 if the objects are in the same environment, 0 otherwise.
 */
varargs int same_env_check(object one, object two, int top_env) {}

/**
 * Finds all objects in a container that match the specified argument.
 * The argument can be a name, ID, or other identifier. Objects are
 * filtered based on visibility and an optional custom filter function.
 *
 * @param {object} tp - The body object of the player or NPC searching.
 * @param {string} arg - The argument to match objects against.
 * @param {object} source - The object to search within (optional, default: caller's environment).
 * @param {function} f - An optional custom filter function (optional).
 * @return {object[]} - An array of located objects or 0 if none are found.
 */
varargs object *find_targets(object tp, string arg, object source, function f) {}

/**
 * Finds a single object in a container that matches the specified argument.
 * The argument can be a name, ID, or other identifier. Objects are
 * filtered based on visibility and an optional custom filter function.
 *
 * @param {object} tp - The body object of the player or NPC searching.
 * @param {string} arg - The argument to match objects against.
 * @param {object} source - The object to search within (optional, default: caller's environment).
 * @param {function} f - An optional custom filter function (optional).
 * @return {object} - The located object, or 0 if not found.
 */
varargs object find_target(object tp, string arg, object source, function f) {}

/**
 * Retrieves all clones of the specified file in the game. If the file
 * is an object, it will retrieve all clones using the object's base name.
 *
 * @param {mixed} file - The file or object to find clones of.
 * @param {int} env_only - Whether to only return clones that have an environment (optional).
 * @return {object[]} - An array of objects that are clones of the specified file.
 */
varargs object *clones(mixed file, int env_only) {}

/**
 * Gets the root uid of an object or the MUD.
 *
 * @param {object} ob - The object to check (optional, default: master object).
 * @return {string} - The root uid.
 */
varargs string get_root_uid(object ob) {}

/**
 * Checks if an object is a clone.
 *
 * @param {object} ob - The object to check (optional, default: previous object).
 * @return {int} - 1 if clone, 0 if not.
 */
varargs int clonep(object ob) {}
