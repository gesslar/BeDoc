---@meta GlassLoaderClass
------------------------------------------------------------------------------
-- GlassLoaderClass
------------------------------------------------------------------------------
if false then -- ensure that functions do not get defined

    ---@class GlassLoaderClass

    local glass_loader
    local ops = {path = nil, cb = nil, execute = nil}

    --- Loads a glass script from a path or url.
    ---
    --- Options table:
    ---
    --- - `path` (string): The path or url to the glass script.
    --- - `cb` (function): The callback function.
    --- - `execute` (boolean): Whether to execute the glass script.
    ---
    ---@example
    ---```lua
    ---glass_loader.load_glass({
    ---  path = "path/to/glass.lua",
    ---  cb = function(result)
    ---    print(result)
    ---  end,
    ---  execute = true
    ---})
    ---```
    ---
    ---@name load_glass
    ---@param opts table - The options table.
    ---@return any - The result of the glass script.
    function glass_loader.load_glass(opts) end

end
