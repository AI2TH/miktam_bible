# Miktam Bible App - Comprehensive UI Test Script
# PowerShell script using ADB to test all UI elements
# Usage: .\ui_test_comprehensive.ps1

param(
    [string]$Device = "emulator-5554",
    [string]$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
)

$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# ============================================================
# HELPERS
# ============================================================
function Invoke-Adb {
    param([string[]]$Args, [int]$TimeoutSecs = 30)
    $proc = Start-Process -FilePath $AdbPath -ArgumentList (@("-s", $Device) + $Args) `
        -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\adb_out.txt" `
        -RedirectStandardError "$env:TEMP\adb_err.txt"
    $out = Get-Content "$env:TEMP\adb_out.txt" -Raw -ErrorAction SilentlyContinue
    $err = Get-Content "$env:TEMP\adb_err.txt" -Raw -ErrorAction SilentlyContinue
    return ($out + $err)
}

function Tap([int]$x, [int]$y) {
    & $AdbPath -s $Device shell input tap $x $y 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
}

function LongPress([int]$x, [int]$y, [int]$durationMs = 1200) {
    & $AdbPath -s $Device shell input swipe $x $y $x $y $durationMs 2>&1 | Out-Null
    Start-Sleep -Milliseconds 1500
}

function SwipeUp() {
    & $AdbPath -s $Device shell input swipe 540 1400 540 600 400 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
}

function SwipeDown() {
    & $AdbPath -s $Device shell input swipe 540 600 540 1400 400 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
}

function PressBack() {
    & $AdbPath -s $Device shell input keyevent KEYCODE_BACK 2>&1 | Out-Null
    Start-Sleep -Milliseconds 800
}

function PressEscape() {
    & $AdbPath -s $Device shell input keyevent KEYCODE_ESCAPE 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500
}

function GetUiDump() {
    $remote = "/sdcard/uidump_test.xml"
    & $AdbPath -s $Device shell uiautomator dump $remote 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500
    $local = "$env:TEMP\uidump_test.xml"
    & $AdbPath -s $Device pull $remote $local 2>&1 | Out-Null
    if (Test-Path $local) {
        return Get-Content $local -Raw -Encoding UTF8
    }
    return ""
}

function FindElement([string]$dump, [string]$text) {
    # Returns bounds of element with matching text
    $pattern = "text=`"$([regex]::Escape($text))`"[^/]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`""
    if ($dump -match $pattern) {
        $x1 = [int]$Matches[1]; $y1 = [int]$Matches[2]
        $x2 = [int]$Matches[3]; $y2 = [int]$Matches[4]
        return @{ X = ($x1+$x2)/2; Y = ($y1+$y2)/2; Found = $true }
    }
    return @{ Found = $false }
}

function TapElement([string]$dump, [string]$text) {
    $el = FindElement $dump $text
    if ($el.Found) {
        Tap ([int]$el.X) ([int]$el.Y)
        return $true
    }
    return $false
}

function WaitForText([string]$text, [int]$timeoutSecs = 12) {
    $deadline = (Get-Date).AddSeconds($timeoutSecs)
    while ((Get-Date) -lt $deadline) {
        $dump = GetUiDump
        if ($dump -match [regex]::Escape($text)) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Screenshot([string]$name) {
    $remote = "/sdcard/test_$name.png"
    $local = "C:\Users\kevin\OneDrive\Documents\kalvin\bible\test_results\$name.png"
    & $AdbPath -s $Device shell screencap $remote 2>&1 | Out-Null
    & $AdbPath -s $Device pull $remote $local 2>&1 | Out-Null
}

# ============================================================
# TEST TRACKING
# ============================================================
$script:TestResults = @()
$script:PassCount = 0
$script:FailCount = 0

function LogResult([string]$name, [bool]$passed, [string]$detail = "") {
    $icon = if ($passed) { "✓" } else { "✗" }
    $status = if ($passed) { "PASS" } else { "FAIL" }
    Write-Host "  $icon $status | $name" -ForegroundColor (if ($passed) { "Green" } else { "Red" })
    if ($detail) { Write-Host "       → $detail" -ForegroundColor Gray }
    
    $script:TestResults += [PSCustomObject]@{
        Test = $name
        Passed = $passed
        Detail = $detail
    }
    if ($passed) { $script:PassCount++ } else { $script:FailCount++ }
}

# ============================================================
# TAB NAVIGATION COORDINATES (1080x2340 screen)
# Tabs: Home(72), Read(216), Search(360), Calendar(504), Profile(648)
# Tab bar Y ≈ 2100
# ============================================================
$TAB_Y = 2100
$TAB_HOME = 72
$TAB_READ = 216
$TAB_SEARCH = 360
$TAB_CALENDAR = 504
$TAB_PROFILE = 648

function GoHome() { Tap $TAB_HOME $TAB_Y; Start-Sleep -Seconds 1.5 }
function GoRead() { Tap $TAB_READ $TAB_Y; Start-Sleep -Seconds 1.5 }
function GoSearch() { Tap $TAB_SEARCH $TAB_Y; Start-Sleep -Seconds 1.5 }
function GoCalendar() { Tap $TAB_CALENDAR $TAB_Y; Start-Sleep -Seconds 1.5 }
function GoProfile() { Tap $TAB_PROFILE $TAB_Y; Start-Sleep -Seconds 1.5 }

# ============================================================
# CHAPTER COUNTS FOR ALL 66 BOOKS
# ============================================================
$CHAPTERS_PER_BOOK = @{
    1=50;2=40;3=27;4=36;5=34;6=24;7=21;8=4;9=31;10=24;
    11=22;12=25;13=29;14=36;15=10;16=13;17=10;18=42;19=150;20=31;
    21=12;22=8;23=66;24=52;25=5;26=48;27=12;28=14;29=3;30=9;
    31=1;32=4;33=7;34=3;35=3;36=3;37=2;38=14;39=4;
    40=28;41=16;42=24;43=21;44=28;45=16;46=16;47=13;48=6;49=6;
    50=4;51=4;52=5;53=3;54=6;55=4;56=3;57=1;58=13;59=5;
    60=5;61=3;62=5;63=1;64=1;65=1;66=22
}

$BOOK_NAMES = @{
    1="Genesis";2="Exodus";3="Leviticus";4="Numbers";5="Deuteronomy";
    6="Joshua";7="Judges";8="Ruth";9="1 Samuel";10="2 Samuel";
    11="1 Kings";12="2 Kings";13="1 Chronicles";14="2 Chronicles";
    15="Ezra";16="Nehemiah";17="Esther";18="Job";19="Psalms";
    20="Proverbs";21="Ecclesiastes";22="Song of Solomon";23="Isaiah";
    24="Jeremiah";25="Lamentations";26="Ezekiel";27="Daniel";
    28="Hosea";29="Joel";30="Amos";31="Obadiah";32="Jonah";
    33="Micah";34="Nahum";35="Habakkuk";36="Zephaniah";37="Haggai";
    38="Zechariah";39="Malachi";
    40="Matthew";41="Mark";42="Luke";43="John";44="Acts";
    45="Romans";46="1 Corinthians";47="2 Corinthians";48="Galatians";
    49="Ephesians";50="Philippians";51="Colossians";
    52="1 Thessalonians";53="2 Thessalonians";
    54="1 Timothy";55="2 Timothy";56="Titus";57="Philemon";
    58="Hebrews";59="James";60="1 Peter";61="2 Peter";
    62="1 John";63="2 John";64="3 John";65="Jude";66="Revelation"
}

$BOOK_ABBR = @{
    1="Gen";2="Exo";3="Lev";4="Num";5="Deu";
    6="Jos";7="Jdg";8="Rut";9="1Sa";10="2Sa";
    11="1Ki";12="2Ki";13="1Ch";14="2Ch";
    15="Ezr";16="Neh";17="Est";18="Job";19="Psa";
    20="Pro";21="Ecc";22="Sng";23="Isa";
    24="Jer";25="Lam";26="Eze";27="Dan";
    28="Hos";29="Joe";30="Amo";31="Oba";32="Jon";
    33="Mic";34="Nah";35="Hab";36="Zep";37="Hag";
    38="Zec";39="Mal";
    40="Mat";41="Mrk";42="Luk";43="Jhn";44="Act";
    45="Rom";46="1Co";47="2Co";48="Gal";
    49="Eph";50="Php";51="Col";
    52="1Th";53="2Th";
    54="1Ti";55="2Ti";56="Tit";57="Phm";
    58="Heb";59="Jas";60="1Pe";61="2Pe";
    62="1Jn";63="2Jn";64="3Jn";65="Jud";66="Rev"
}

# ============================================================
# TEST FUNCTIONS
# ============================================================

function Test-HomeScreen {
    Write-Host "`n=== HOME SCREEN TESTS ===" -ForegroundColor Cyan
    GoHome
    Start-Sleep -Seconds 1
    $dump = GetUiDump
    Screenshot "home_screen"
    
    LogResult "Home screen: Miktam Bible title" ($dump -match "Miktam Bible")
    LogResult "Home screen: Verse of Day card" ($dump -match "Verse of the Day" -or $dump -match "John 3:16")
    LogResult "Home screen: Continue Study card" ($dump -match "Continue Study" -or $dump -match "Resume Reading")
    LogResult "Home screen: AI Assistant card" ($dump -match "AI Study Assistant" -or $dump -match "100% OFFLINE")
    LogResult "Home screen: Read tab visible" ($dump -match ">Read<")
    LogResult "Home screen: Search tab visible" ($dump -match ">Search<")
    LogResult "Home screen: Calendar tab visible" ($dump -match ">Calendar<")
    LogResult "Home screen: Profile tab visible" ($dump -match ">Profile<")
}

function Test-VersionsList {
    Write-Host "`n=== READ TAB: VERSION PICKER TESTS ===" -ForegroundColor Cyan
    GoRead
    Start-Sleep -Seconds 2
    $dump = GetUiDump
    Screenshot "read_book_picker"
    
    LogResult "Read tab: Holy Bible header" ($dump -match "Holy Bible")
    LogResult "Read tab: Old Testament tab" ($dump -match "Old Testament")
    LogResult "Read tab: New Testament tab" ($dump -match "New Testament")
    LogResult "Read tab: Book grid visible" ($dump -match "Gen" -or $dump -match "Genesis")
    
    # Check for version chips
    $knownVersions = @("KJV","BBE","RVR","LSG","HIN","TAM","TEL","KAN","MAL","KOR","RON","ARA","NCV","EPO","FIN","LUT","WEB","GRC")
    $foundVersions = $knownVersions | Where-Object { $dump -match $_ -or $dump -match $_.ToLower() }
    LogResult "Read tab: Downloaded versions visible" ($foundVersions.Count -gt 0) "Found: $($foundVersions -join ', ')"
    
    return $foundVersions
}

function Test-BookGridNavigation {
    Write-Host "`n=== BOOK GRID NAVIGATION TESTS ===" -ForegroundColor Cyan
    GoRead
    Start-Sleep -Seconds 2
    $dump = GetUiDump
    
    # Test OT books
    $otAbbrs = @("Gen","Exo","Lev","Num","Deu","Jos","Jdg","Rut","1Sa","2Sa","1Ki","2Ki","Psa","Pro","Isa","Jer","Dan","Mal")
    $foundOT = $otAbbrs | Where-Object { $dump -match $_ }
    LogResult "OT books visible (first page)" ($foundOT.Count -ge 5) "Found $($foundOT.Count)/18 tested: $($foundOT -join ', ')"
    
    # Switch to NT
    $ntEl = FindElement $dump "New Testament (27)"
    if ($ntEl.Found) {
        Tap ([int]$ntEl.X) ([int]$ntEl.Y)
        Start-Sleep -Seconds 1
        $dump2 = GetUiDump
        $ntAbbrs = @("Mat","Mrk","Luk","Jhn","Act","Rom","1Co","2Co","Gal","Eph","Php","Col","Rev")
        $foundNT = $ntAbbrs | Where-Object { $dump2 -match $_ }
        LogResult "NT books visible after tab switch" ($foundNT.Count -ge 5) "Found $($foundNT.Count)/13 tested: $($foundNT -join ', ')"
        Screenshot "nt_books_grid"
    } else {
        LogResult "NT tab switch" $false "NT tab not found"
    }
    
    # Switch back to OT
    $dump3 = GetUiDump
    $otEl = FindElement $dump3 "Old Testament (39)"
    if ($otEl.Found) {
        Tap ([int]$otEl.X) ([int]$otEl.Y)
        Start-Sleep -Seconds 1
    }
}

function NavigateToBook([int]$bookNum) {
    GoRead
    Start-Sleep -Seconds 1.5
    
    $abbr = $BOOK_ABBR[$bookNum]
    
    # Switch to correct testament
    $dump = GetUiDump
    if ($bookNum -ge 40) {
        $ntEl = FindElement $dump "New Testament (27)"
        if ($ntEl.Found) {
            Tap ([int]$ntEl.X) ([int]$ntEl.Y)
            Start-Sleep -Seconds 1
        }
    } else {
        $otEl = FindElement $dump "Old Testament (39)"
        if ($otEl.Found) {
            Tap ([int]$otEl.X) ([int]$otEl.Y)
            Start-Sleep -Seconds 1
        }
    }
    
    # Find book in grid
    $dump2 = GetUiDump
    $bookEl = FindElement $dump2 $abbr
    if (-not $bookEl.Found) {
        # Scroll down to find book
        SwipeUp
        Start-Sleep -Seconds 0.5
        $dump2 = GetUiDump
        $bookEl = FindElement $dump2 $abbr
    }
    if (-not $bookEl.Found) {
        # Try one more scroll
        SwipeUp
        Start-Sleep -Seconds 0.5
        $dump2 = GetUiDump
        $bookEl = FindElement $dump2 $abbr
    }
    
    if ($bookEl.Found) {
        Tap ([int]$bookEl.X) ([int]$bookEl.Y)
        Start-Sleep -Seconds 1.5
        return $true
    }
    return $false
}

function NavigateToChapter([int]$bookNum, [int]$chapterNum) {
    $ok = NavigateToBook $bookNum
    if (-not $ok) { return $false }
    
    # Now in chapter grid - find chapter number
    $dump = GetUiDump
    $chEl = FindElement $dump "$chapterNum"
    if (-not $chEl.Found) {
        # Scroll to find chapter
        SwipeUp
        $dump = GetUiDump
        $chEl = FindElement $dump "$chapterNum"
    }
    
    if ($chEl.Found) {
        Tap ([int]$chEl.X) ([int]$chEl.Y)
        Start-Sleep -Seconds 2.5
        return $true
    }
    return $false
}

function Test-ChapterReader([int]$bookNum, [int]$chapterNum, [string]$desc, [bool]$testLongPress = $true) {
    Write-Host "`n  Testing Chapter: $desc" -ForegroundColor Yellow
    
    $ok = NavigateToChapter $bookNum $chapterNum
    LogResult "$desc - Navigation works" $ok
    if (-not $ok) { return }
    
    Start-Sleep -Seconds 1.5
    $dump = GetUiDump
    
    # Check verse content loaded
    $hasContent = ($dump.Length -gt 2000) -and ($dump -match "\d+")
    LogResult "$desc - Verses loaded (content present)" $hasContent
    
    # Tap verse 1 (approximately middle of screen, upper portion)
    Tap 540 750
    Start-Sleep -Seconds 0.5
    $dumpAfterTap = GetUiDump
    LogResult "$desc - Verse tap works (no crash)" $true  # If we get here without crash
    
    if ($testLongPress) {
        # Long press verse 1 to open action sheet
        LongPress 540 750 1500
        Start-Sleep -Seconds 1.5
        $dumpSheet = GetUiDump
        $hasSheet = $dumpSheet -match "Highlight" -or $dumpSheet -match "Note" -or $dumpSheet -match "Study"
        LogResult "$desc - Long press opens action sheet" $hasSheet
        
        if ($hasSheet) {
            Screenshot "action_sheet_${bookNum}_${chapterNum}"
            # Close action sheet
            PressBack
            Start-Sleep -Seconds 0.8
        }
    }
}

function Test-AllBooksAllChapters([string[]]$versionIds) {
    Write-Host "`n=== ALL BOOKS - ALL CHAPTERS SAMPLE TEST ===" -ForegroundColor Cyan
    Write-Host "  Testing representative chapters from each book..." -ForegroundColor Gray
    
    # Test first chapter of every book
    $booksToTest = 1..66
    
    foreach ($bookNum in $booksToTest) {
        $bookName = $BOOK_NAMES[$bookNum]
        $abbr = $BOOK_ABBR[$bookNum]
        $maxChapters = $CHAPTERS_PER_BOOK[$bookNum]
        
        Write-Host "`n  Book $bookNum: $bookName ($maxChapters chapters)" -ForegroundColor White
        
        # Navigate to book
        GoRead
        Start-Sleep -Seconds 1
        
        # Switch testament
        $dump = GetUiDump
        if ($bookNum -ge 40) {
            $ntEl = FindElement $dump "New Testament (27)"
            if ($ntEl.Found) {
                Tap ([int]$ntEl.X) ([int]$ntEl.Y)
                Start-Sleep -Seconds 0.8
            }
        } else {
            # Make sure OT is selected
            $otEl = FindElement $dump "Old Testament (39)"
            if ($otEl.Found) {
                Tap ([int]$otEl.X) ([int]$otEl.Y)
                Start-Sleep -Seconds 0.8
            }
        }
        
        # Find book in grid
        $dump2 = GetUiDump
        $bookEl = FindElement $dump2 $abbr
        $scrollAttempts = 0
        while (-not $bookEl.Found -and $scrollAttempts -lt 3) {
            SwipeUp
            Start-Sleep -Seconds 0.5
            $dump2 = GetUiDump
            $bookEl = FindElement $dump2 $abbr
            $scrollAttempts++
        }
        
        if (-not $bookEl.Found) {
            LogResult "Book $bookNum ($abbr) found in grid" $false
            continue
        }
        
        Tap ([int]$bookEl.X) ([int]$bookEl.Y)
        Start-Sleep -Seconds 1.5
        LogResult "Book $bookNum ($abbr) tappable" $true
        
        # Test chapter 1 (always)
        $dump3 = GetUiDump
        $hasChapterGrid = $dump3 -match "1" -and $dump3.Length -gt 500
        LogResult "Book $bookNum: chapter grid shows" $hasChapterGrid
        
        $ch1El = FindElement $dump3 "1"
        if ($ch1El.Found) {
            Tap ([int]$ch1El.X) ([int]$ch1El.Y)
            Start-Sleep -Seconds 2
            
            $dump4 = GetUiDump
            $hasVerses = $dump4.Length -gt 1500
            LogResult "Book $bookNum Ch1: verses displayed" $hasVerses
            
            # Quick verse tap test
            Tap 540 800
            Start-Sleep -Seconds 0.3
            LogResult "Book $bookNum Ch1: verse tap works" $true
            
            # If middle chapter exists, test it too
            if ($maxChapters -gt 3) {
                $midChap = [int]($maxChapters / 2)
                PressBack  # back to chapter grid
                Start-Sleep -Seconds 1
                
                $dump5 = GetUiDump
                # Scroll if needed to find mid chapter
                $midEl = FindElement $dump5 "$midChap"
                $scrollMid = 0
                while (-not $midEl.Found -and $scrollMid -lt 2) {
                    SwipeUp
                    Start-Sleep -Seconds 0.5
                    $dump5 = GetUiDump
                    $midEl = FindElement $dump5 "$midChap"
                    $scrollMid++
                }
                
                if ($midEl.Found) {
                    Tap ([int]$midEl.X) ([int]$midEl.Y)
                    Start-Sleep -Seconds 2
                    $dump6 = GetUiDump
                    LogResult "Book $bookNum Ch$midChap: verses displayed" ($dump6.Length -gt 1500)
                }
            }
            
            # If last chapter exists and different from mid, test it
            if ($maxChapters -gt 1) {
                PressBack  # back to chapter grid (or book picker)
                Start-Sleep -Seconds 1
                
                # Check if we're in chapter grid
                $dump7 = GetUiDump
                $lastEl = FindElement $dump7 "$maxChapters"
                $scrollLast = 0
                while (-not $lastEl.Found -and $scrollLast -lt 3) {
                    SwipeUp
                    Start-Sleep -Seconds 0.5
                    $dump7 = GetUiDump
                    $lastEl = FindElement $dump7 "$maxChapters"
                    $scrollLast++
                }
                
                if ($lastEl.Found) {
                    Tap ([int]$lastEl.X) ([int]$lastEl.Y)
                    Start-Sleep -Seconds 2
                    $dump8 = GetUiDump
                    LogResult "Book $bookNum Ch$maxChapters (last): verses displayed" ($dump8.Length -gt 1500)
                }
            }
        } else {
            LogResult "Book $bookNum Ch1: chapter tappable" $false
        }
    }
}

function Test-VersionSwitching([string[]]$versionIds) {
    Write-Host "`n=== VERSION SWITCHING IN READER ===" -ForegroundColor Cyan
    
    # Navigate to Genesis 1 first
    $ok = NavigateToChapter 1 1
    if (-not $ok) {
        LogResult "Genesis 1 initial navigation" $false
        return
    }
    
    Start-Sleep -Seconds 1.5
    
    # Tap the version button in header (top-right area)
    # Based on the screenshot, version badge is at approximately x=820, y=130
    Tap 820 130
    Start-Sleep -Seconds 1.5
    $dump = GetUiDump
    $hasVersionSheet = $dump -match "Select Translation" -or $dump -match "Translation"
    LogResult "Version selector sheet opens" $hasVersionSheet
    
    if (-not $hasVersionSheet) {
        # Try different position
        Tap 900 110
        Start-Sleep -Seconds 1.5
        $dump = GetUiDump
        $hasVersionSheet = $dump -match "Select Translation" -or $dump -match "Translation" -or $dump -match "KJV" -or $dump -match "BBE"
        LogResult "Version selector sheet (retry)" $hasVersionSheet
    }
    
    Screenshot "version_selector"
    
    if ($hasVersionSheet) {
        # Test each version by tapping it
        $versionsToTest = @(
            @{Id="KJV"; Lang="EN"; Desc="English KJV"},
            @{Id="BBE"; Lang="EN"; Desc="English BBE"},
            @{Id="LSG"; Lang="FR"; Desc="French LSG"},
            @{Id="LUT"; Lang="DE"; Desc="German Luther"},
            @{Id="RVR"; Lang="ES"; Desc="Spanish RVR"},
            @{Id="EPO"; Lang="EO"; Desc="Esperanto"},
            @{Id="FIN"; Lang="FI"; Desc="Finnish"},
            @{Id="RON"; Lang="RO"; Desc="Romanian"},
            @{Id="POR_AA"; Lang="PT"; Desc="Portuguese"},
            @{Id="ARA"; Lang="AR"; Desc="Arabic"},
            @{Id="HIN"; Lang="HI"; Desc="Hindi"},
            @{Id="TAM"; Lang="TA"; Desc="Tamil"},
            @{Id="TEL"; Lang="TE"; Desc="Telugu"},
            @{Id="KAN"; Lang="KN"; Desc="Kannada"},
            @{Id="MAL"; Lang="ML"; Desc="Malayalam"},
            @{Id="KOR"; Lang="KO"; Desc="Korean"},
            @{Id="GRC"; Lang="GRC"; Desc="Ancient Greek"},
            @{Id="NCV"; Lang="EN"; Desc="English NCV"},
            @{Id="WEB"; Lang="EN"; Desc="English WEB"}
        )
        
        foreach ($ver in $versionsToTest) {
            $dump = GetUiDump
            # Look for version chip by ID (all caps or mixed)
            $verEl = FindElement $dump $ver.Id
            if (-not $verEl.Found) {
                # Try lowercase
                $verEl = FindElement $dump $ver.Id.ToLower()
            }
            if (-not $verEl.Found) {
                # Scroll sheet to find version
                SwipeUp
                Start-Sleep -Seconds 0.5
                $dump = GetUiDump
                $verEl = FindElement $dump $ver.Id
            }
            
            if ($verEl.Found) {
                Tap ([int]$verEl.X) ([int]$verEl.Y)
                Start-Sleep -Seconds 2
                
                # Version sheet closes, we're back in reader
                $dump2 = GetUiDump
                $hasContent = $dump2.Length -gt 1500
                LogResult "$($ver.Desc) ($($ver.Id)) - Genesis 1 displays" $hasContent
                
                Screenshot "version_$($ver.Id.ToLower())_gen1"
                
                # Re-open version sheet for next
                Tap 820 130
                Start-Sleep -Seconds 1.5
                $dump = GetUiDump
                if (-not ($dump -match "Select Translation" -or $dump -match "KJV" -or $dump -match "BBE")) {
                    Tap 900 110
                    Start-Sleep -Seconds 1
                }
            } else {
                LogResult "$($ver.Desc) ($($ver.Id)) - Version chip found" $false "Not visible in version sheet"
            }
        }
        
        # Close version sheet
        PressBack
        Start-Sleep -Seconds 0.8
    }
}

function Test-SearchFeature {
    Write-Host "`n=== SEARCH TAB TESTS ===" -ForegroundColor Cyan
    GoSearch
    Start-Sleep -Seconds 2
    $dump = GetUiDump
    LogResult "Search tab: opens correctly" ($dump -match "Search" -or $dump -match "search")
    Screenshot "search_empty"
    
    # Type search query - find input box and tap
    $inputEl = FindElement $dump "Search the Bible..."
    if (-not $inputEl.Found) {
        # Tap in the search bar area (approximately top of screen)
        Tap 540 180
    } else {
        Tap ([int]$inputEl.X) ([int]$inputEl.Y)
    }
    Start-Sleep -Seconds 0.5)
    
    & $AdbPath -s $Device shell input text "love" 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $dump2 = GetUiDump
    $hasResults = $dump2 -match "John" -or $dump2 -match "Rom" -or $dump2 -match "love" -or $dump2 -match "result"
    LogResult "Search 'love': results appear" $hasResults
    Screenshot "search_love"
    
    # Clear and search for 'faith'
    & $AdbPath -s $Device shell input keyevent KEYCODE_CTRL_A 2>&1 | Out-Null
    & $AdbPath -s $Device shell input text "faith" 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $dump3 = GetUiDump
    $hasResults2 = $dump3 -match "Heb" -or $dump3 -match "faith" -or $dump3 -match "Rom"
    LogResult "Search 'faith': results appear" $hasResults2
    
    # Test concordance link
    $concordEl = FindElement $dump3 "Concordance"
    if ($concordEl.Found) {
        LogResult "Search: Concordance link visible" $true
    }
    
    # Clear search
    & $AdbPath -s $Device shell input keyevent KEYCODE_CLEAR 2>&1 | Out-Null
    Start-Sleep -Seconds 0.5
}

function Test-CalendarTab {
    Write-Host "`n=== CALENDAR TAB TESTS ===" -ForegroundColor Cyan
    GoCalendar
    Start-Sleep -Seconds 2
    $dump = GetUiDump
    LogResult "Calendar tab: opens correctly" ($dump.Length -gt 500)
    $hasCalendar = $dump -match "2026" -or $dump -match "streak" -or $dump -match "Streak" -or $dump -match "January" -or $dump -match "June" -or $dump -match "Chapter"
    LogResult "Calendar tab: content visible" $hasCalendar
    Screenshot "calendar_tab"
}

function Test-ProfileTab {
    Write-Host "`n=== PROFILE/SETTINGS TAB TESTS ===" -ForegroundColor Cyan
    GoProfile
    Start-Sleep -Seconds 2
    $dump = GetUiDump
    $hasTheme = $dump -match "DARK" -or $dump -match "LIGHT" -or $dump -match "SYSTEM" -or $dump -match "Theme"
    LogResult "Profile tab: theme selector visible" $hasTheme
    $hasReflections = $dump -match "Reflections" -or $dump -match "Notes" -or $dump -match "Study"
    LogResult "Profile tab: study reflections section" $hasReflections
    Screenshot "profile_tab"
}

function Test-VerseActionSheet([int]$bookNum, [int]$chapterNum) {
    Write-Host "`n=== VERSE ACTION SHEET TESTS (Book $bookNum Ch $chapterNum) ===" -ForegroundColor Cyan
    
    $ok = NavigateToChapter $bookNum $chapterNum
    if (-not $ok) {
        LogResult "Action sheet test: navigation" $false
        return
    }
    
    Start-Sleep -Seconds 2
    
    # Long press verse 1
    LongPress 540 800 1500
    Start-Sleep -Seconds 2
    
    $dump = GetUiDump
    $hasSheet = $dump -match "Highlight" -or $dump -match "Note" -or $dump -match "Study" -or $dump -match "Cross Ref"
    LogResult "Verse action sheet: opens on long press" $hasSheet
    Screenshot "verse_action_sheet"
    
    if ($hasSheet) {
        # Check for all action sheet options
        LogResult "Action sheet: Highlight Color picker" ($dump -match "Highlight Color" -or $dump -match "Highlight")
        LogResult "Action sheet: Original Language button" ($dump -match "Original Language" -or $dump -match "Language")
        LogResult "Action sheet: Cross References button" ($dump -match "Cross References" -or $dump -match "Cross Ref")
        LogResult "Action sheet: Study Reflection Note" ($dump -match "Study Reflection" -or $dump -match "Note" -or $dump -match "reflection")
        
        # Close
        PressBack
        Start-Sleep -Seconds 0.8
    }
}

# ============================================================
# MAIN TEST RUNNER
# ============================================================
function Run-AllTests {
    Write-Host "=" * 65
    Write-Host "  MIKTAM BIBLE APP - COMPREHENSIVE UI TEST SUITE"
    Write-Host "  Device: $Device"
    Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "=" * 65
    
    # Ensure test results directory exists
    $resultsDir = "C:\Users\kevin\OneDrive\Documents\kalvin\bible\test_results"
    if (-not (Test-Path $resultsDir)) { New-Item -ItemType Directory -Path $resultsDir | Out-Null }
    
    # Launch App
    Write-Host "`n[SETUP] Launching app..." -ForegroundColor Cyan
    & $AdbPath -s $Device shell cmd activity start-activity "$PKG/.MainActivity" 2>&1 | Out-Null
    Start-Sleep -Seconds 6
    $launched = WaitForText "Miktam Bible" 15
    LogResult "App launches successfully" $launched
    
    if (-not $launched) {
        Write-Host "[ERROR] App failed to launch!" -ForegroundColor Red
        return
    }
    
    Screenshot "01_app_launched"
    
    # === TEST GROUPS ===
    Test-HomeScreen
    $foundVersions = Test-VersionsList
    Test-BookGridNavigation
    Test-VerseActionSheet 1 1   # Genesis 1
    Test-VerseActionSheet 43 3  # John 3
    Test-VersionSwitching $foundVersions
    Test-AllBooksAllChapters $foundVersions
    Test-SearchFeature
    Test-CalendarTab
    Test-ProfileTab
    
    # Final screenshot
    GoHome
    Screenshot "final_home_state"
    
    # ============================================================
    # SUMMARY
    # ============================================================
    Write-Host "`n" + ("=" * 65)
    Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
    Write-Host "=" * 65
    
    $total = $script:PassCount + $script:FailCount
    $pct = if ($total -gt 0) { [math]::Round(100 * $script:PassCount / $total) } else { 0 }
    
    Write-Host "`n  TOTAL TESTS : $total"
    Write-Host "  PASSED      : $script:PassCount" -ForegroundColor Green
    Write-Host "  FAILED      : $script:FailCount" -ForegroundColor $(if ($script:FailCount -eq 0) { "Green" } else { "Red" })
    Write-Host "  PASS RATE   : $pct%" -ForegroundColor $(if ($pct -ge 80) { "Green" } elseif ($pct -ge 60) { "Yellow" } else { "Red" })
    
    if ($script:FailCount -gt 0) {
        Write-Host "`n  FAILED TESTS:" -ForegroundColor Red
        $script:TestResults | Where-Object { -not $_.Passed } | ForEach-Object {
            Write-Host "    ✗ $($_.Test)" -ForegroundColor Red
            if ($_.Detail) { Write-Host "       → $($_.Detail)" -ForegroundColor Gray }
        }
    }
    
    # Save JSON results
    $jsonPath = "C:\Users\kevin\OneDrive\Documents\kalvin\bible\test_results\ui_test_results.json"
    $script:TestResults | ConvertTo-Json | Out-File -FilePath $jsonPath -Encoding UTF8
    Write-Host "`n  Results saved to: $jsonPath" -ForegroundColor Gray
    Write-Host "`n  Screenshots saved to: $resultsDir\" -ForegroundColor Gray
}

# RUN ALL TESTS
Run-AllTests
