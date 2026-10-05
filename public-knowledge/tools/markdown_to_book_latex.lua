local function trim(text)
  return (text:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function blocks_to_latex(blocks)
  return pandoc.write(
    pandoc.Pandoc(blocks),
    "latex",
    { wrap_text = "none" }
  )
end

local function split_break_lines(latex)
  local lines = {}
  local normalized = latex:gsub("\r", ""):gsub("\n", " ")
  for piece in (normalized .. "\\\\"):gmatch("(.-)\\\\") do
    piece = trim(piece)
    if piece ~= "" then
      table.insert(lines, piece)
    end
  end
  return lines
end

local function render_titlepage(div)
  local lines = split_break_lines(blocks_to_latex(div.content))
  if #lines < 6 then
    return "\\begin{titlepage}\n\\centering\n" .. blocks_to_latex(div.content) .. "\n\\end{titlepage}\n"
  end

  return table.concat({
    "\\begin{titlepage}",
    "    \\centering",
    "    \\vspace*{1.5cm}",
    "    {\\Huge " .. lines[1] .. "\\\\ " .. lines[2] .. "} \\\\",
    "    \\vspace{0.5cm}",
    "    {\\large " .. lines[3] .. "} \\\\",
    "    \\vspace{2cm}",
    "    " .. lines[4] .. " \\\\",
    "    \\vspace{0.5cm}",
    "    {\\small " .. lines[5] .. "} \\\\",
    "    \\vfill",
    "    {\\small " .. lines[6] .. "}",
    "    \\vspace{1cm}",
    "\\end{titlepage}",
    ""
  }, "\n")
end

local function render_copyright(div)
  return table.concat({
    "\\newpage",
    "\\thispagestyle{empty}",
    "\\vspace*{\\fill}",
    "\\begin{center}",
    "    \\small",
    blocks_to_latex(div.content),
    "\\end{center}",
    "\\vspace{1cm}",
    "\\newpage",
    ""
  }, "\n")
end

local function render_center(div)
  local inner = trim(blocks_to_latex(div.content))
  if inner:find("\\cdot", 1, true) and inner:find("\\odot", 1, true) then
    return "\\ornament\n"
  end

  return table.concat({
    "\\begin{center}",
    inner,
    "\\end{center}",
    ""
  }, "\n")
end

function Pandoc(doc)
  local output = {}
  local blocks = doc.blocks
  local index = 1
  local seen_first_chapter = false
  local inserted_mainmatter = false

  if blocks[index] and blocks[index].t == "Div" and blocks[index].classes:includes("titlepage") then
    table.insert(output, pandoc.RawBlock("latex", render_titlepage(blocks[index])))
    index = index + 1
  end

  if blocks[index] and blocks[index].t == "Div" and blocks[index].classes:includes("center") then
    table.insert(output, pandoc.RawBlock("latex", render_copyright(blocks[index])))
    index = index + 1
  end

  table.insert(output, pandoc.RawBlock("latex", "\\frontmatter\n\\tableofcontents\n"))

  for i = index, #blocks do
    local block = blocks[i]

    if block.t == "Div" and block.classes:includes("center") then
      table.insert(output, pandoc.RawBlock("latex", render_center(block)))
    elseif block.t == "Header" and block.level == 1 then
      if seen_first_chapter and not inserted_mainmatter then
        table.insert(output, pandoc.RawBlock("latex", "\\mainmatter\n"))
        inserted_mainmatter = true
      end
      seen_first_chapter = true
      table.insert(output, block)
    elseif block.t == "Header" and block.level == 2 then
      table.insert(output, pandoc.RawBlock("latex", "\\sectionbreak\n"))
      table.insert(output, block)
    else
      table.insert(output, block)
    end
  end

  return pandoc.Pandoc(output, doc.meta)
end
