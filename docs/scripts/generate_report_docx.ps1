Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Escape-Xml {
  param([string]$Text)
  return [System.Security.SecurityElement]::Escape($Text)
}

function Add-Block {
  param(
    [System.Collections.Generic.List[object]]$Blocks,
    [string]$Kind,
    [string]$Text
  )

  $Blocks.Add([pscustomobject]@{
      Kind = $Kind
      Text = $Text
    }) | Out-Null
}

function Parse-Markdown {
  param([string]$Text)

  $blocks = [System.Collections.Generic.List[object]]::new()
  $paragraphLines = [System.Collections.Generic.List[string]]::new()

  function Flush-Paragraph {
    if ($paragraphLines.Count -gt 0) {
      Add-Block -Blocks $blocks -Kind 'paragraph' -Text (($paragraphLines -join ' ').Trim())
      $paragraphLines.Clear()
    }
  }

  foreach ($rawLine in ($Text -split "`r?`n")) {
    $line = $rawLine.TrimEnd()
    $stripped = $line.Trim()

    if (-not $stripped) {
      Flush-Paragraph
      continue
    }

    if ($stripped -eq '---PAGEBREAK---') {
      Flush-Paragraph
      Add-Block -Blocks $blocks -Kind 'pagebreak' -Text ''
      continue
    }

    if ($stripped -match '^(#{1,4})\s+(.*)$') {
      Flush-Paragraph
      Add-Block -Blocks $blocks -Kind ("h{0}" -f $Matches[1].Length) -Text $Matches[2].Trim()
      continue
    }

    if ($stripped.StartsWith('- ')) {
      Flush-Paragraph
      Add-Block -Blocks $blocks -Kind 'bullet' -Text $stripped.Substring(2).Trim()
      continue
    }

    if ($stripped -match '^\d+\.\s+') {
      Flush-Paragraph
      Add-Block -Blocks $blocks -Kind 'ordered' -Text $stripped
      continue
    }

    $paragraphLines.Add($stripped) | Out-Null
  }

  Flush-Paragraph
  return $blocks
}

function New-RunXml {
  param([string]$Text)
  $escaped = Escape-Xml $Text
  return "<w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r>"
}

function New-ParagraphXml {
  param(
    [string]$Text,
    [string]$Style
  )

  $runXml = if ($Text) { New-RunXml $Text } else { '' }
  return "<w:p><w:pPr><w:pStyle w:val=`"$Style`"/></w:pPr>$runXml</w:p>"
}

function New-PageBreakXml {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
}

function Render-DocumentXml {
  param([System.Collections.Generic.List[object]]$Blocks)

  $parts = [System.Collections.Generic.List[string]]::new()
  $pageIndex = 0

  foreach ($block in $Blocks) {
    if ($block.Kind -eq 'pagebreak') {
      $parts.Add((New-PageBreakXml)) | Out-Null
      $pageIndex += 1
      continue
    }

    if ($pageIndex -eq 0) {
      switch ($block.Kind) {
        'h1' {
          $parts.Add((New-ParagraphXml -Text $block.Text -Style 'Title')) | Out-Null
          continue
        }
        'h2' {
          $parts.Add((New-ParagraphXml -Text $block.Text -Style 'Subtitle')) | Out-Null
          continue
        }
        'paragraph' {
          $parts.Add((New-ParagraphXml -Text $block.Text -Style 'Centered')) | Out-Null
          continue
        }
      }
    }

    $style = switch ($block.Kind) {
      'h1' { 'Heading1' }
      'h2' { 'Heading2' }
      'h3' { 'Heading3' }
      'h4' { 'Heading4' }
      'bullet' { 'ListParagraph' }
      'ordered' { 'ListParagraph' }
      default { 'Normal' }
    }

    if ($block.Kind -eq 'bullet') {
      $parts.Add((New-ParagraphXml -Text ("• " + $block.Text) -Style $style)) | Out-Null
    } else {
      $parts.Add((New-ParagraphXml -Text $block.Text -Style $style)) | Out-Null
    }
  }

  $bodyXml = ($parts -join '') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + $bodyXml + '</w:body></w:document>'
}

function Get-StylesXml {
  return @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/>
        <w:lang w:val="vi-VN"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
      <w:ind w:firstLine="720"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Centered">
    <w:name w:val="Centered"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:ind w:firstLine="0"/>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Centered"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="240" w:after="240"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="40"/>
      <w:szCs w:val="40"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Centered"/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:after="200"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="30"/>
      <w:szCs w:val="30"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="200" w:after="180"/>
      <w:ind w:firstLine="0"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="180" w:after="140"/>
      <w:ind w:firstLine="0"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="140" w:after="120"/>
      <w:ind w:firstLine="0"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="Heading 4"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="120" w:after="80"/>
      <w:ind w:firstLine="0"/>
      <w:outlineLvl w:val="3"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:i/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:after="80"/>
      <w:ind w:left="720" w:hanging="360"/>
    </w:pPr>
  </w:style>
</w:styles>
'@
}

function Get-ContentTypesXml {
  return @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@
}

function Get-RootRelsXml {
  return @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@
}

function Get-DocumentRelsXml {
  return @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@
}

function Get-CoreXml {
  param([string]$Title)

  $created = [DateTime]::UtcNow.ToString('s') + 'Z'
  $escapedTitle = Escape-Xml $Title

  return @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>$escapedTitle</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">$created</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$created</dcterms:modified>
</cp:coreProperties>
"@
}

function Get-AppXml {
  return @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>
'@
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docsDir = Split-Path -Parent $scriptDir
$sourcePath = Join-Path $docsDir 'Bao_cao_DATN_Social.md'
$outputPath = Join-Path $docsDir 'Bao_cao_DATN_Social.docx'
$tempDir = Join-Path $docsDir '.docx-build'
$zipPath = Join-Path $docsDir 'Bao_cao_DATN_Social.zip'

if (Test-Path $tempDir) {
  Remove-Item -LiteralPath $tempDir -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

New-Item -ItemType Directory -Path (Join-Path $tempDir '_rels') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir 'word') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir 'word\_rels') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir 'docProps') -Force | Out-Null

$markdown = Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8
$blocks = Parse-Markdown -Text $markdown
$documentXml = Render-DocumentXml -Blocks $blocks

Write-Utf8NoBom -Path (Join-Path $tempDir '[Content_Types].xml') -Content (Get-ContentTypesXml)
Write-Utf8NoBom -Path (Join-Path $tempDir '_rels\.rels') -Content (Get-RootRelsXml)
Write-Utf8NoBom -Path (Join-Path $tempDir 'word\document.xml') -Content $documentXml
Write-Utf8NoBom -Path (Join-Path $tempDir 'word\styles.xml') -Content (Get-StylesXml)
Write-Utf8NoBom -Path (Join-Path $tempDir 'word\_rels\document.xml.rels') -Content (Get-DocumentRelsXml)
Write-Utf8NoBom -Path (Join-Path $tempDir 'docProps\core.xml') -Content (Get-CoreXml -Title 'Bao cao DATN Social')
Write-Utf8NoBom -Path (Join-Path $tempDir 'docProps\app.xml') -Content (Get-AppXml)

Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -Force
Move-Item -LiteralPath $zipPath -Destination $outputPath -Force
Remove-Item -LiteralPath $tempDir -Recurse -Force

Write-Output $outputPath
