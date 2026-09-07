/**
 * Traktor NML fixtures for the round-trip preservation tests.
 *
 * Shared between `source-entry.test.ts` (does the scanner see every field?) and
 * `export.test.ts` (does the writer hand every field back?) so the two can
 * never drift onto different definitions of "a real entry".
 */

/**
 * Shaped after a real Traktor 3.5.1 entry: the element and attribute set below
 * is the one measured on a 3017-entry collection, minus the owner's paths and
 * titles. Every field here is one the old writer dropped.
 */
export const REAL_SHAPE_NML = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19"><HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
<MUSICFOLDERS></MUSICFOLDERS>
<COLLECTION ENTRIES="2"><ENTRY MODIFIED_DATE="2024/4/25" MODIFIED_TIME="79621" LOCK="1" LOCK_MODIFICATION_TIME="2018-10-15T09:58:35" AUDIO_ID="AIQBQyERRBAAEhAA" TITLE="Peak Freq" ARTIST="Mira Phase"><LOCATION DIR="/:Users/:dj/:Music/:" FILE="peak.mp3" VOLUME="Macintosh HD" VOLUMEID="Macintosh HD"></LOCATION>
<ALBUM TITLE="Warehouse Vol 3" TRACK="4"></ALBUM>
<MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
<INFO BITRATE="320000" COVERARTID="059/1BXRENA13QCHFADF55SXAOJ3IERA" GENRE="Hard Techno" COMMENT="peak hour" KEY="1m" PLAYTIME="132" PLAYTIME_FLOAT="131.813873" IMPORT_DATE="2018/8/29" LAST_PLAYED="2024/3/1" PLAYCOUNT="12" FLAGS="30" FILESIZE="5244" LABEL="Hard Records" RELEASE_DATE="2018/1/1"></INFO>
<TEMPO BPM="133.000000" BPM_QUALITY="100.000000"></TEMPO>
<LOUDNESS PEAK_DB="-0.403555" PERCEIVED_DB="0.000000" ANALYZED_DB="1.203003"></LOUDNESS>
<MUSICAL_KEY VALUE="21"></MUSICAL_KEY>
<CUE_V2 NAME="Drop" DISPL_ORDER="0" TYPE="4" START="55.387418" LEN="0.000000" REPEATS="-1" HOTCUE="0"></CUE_V2>
<CUE_V2 NAME="Break" DISPL_ORDER="0" TYPE="0" START="98.100000" LEN="0.000000" REPEATS="-1" HOTCUE="1"></CUE_V2>
<LOOPINFO SAMPLE_TYPE_INFO="1"></LOOPINFO>
</ENTRY>
<ENTRY TITLE="Intro Bloom" ARTIST="Nova Relay"><LOCATION DIR="/:Users/:dj/:Music/:" FILE="intro.mp3" VOLUME="ROBERT HD2" VOLUMEID="ROBERT HD2"></LOCATION>
<INFO GENRE="Deep House" PLAYTIME="312"></INFO>
<TEMPO BPM="120.000000"></TEMPO>
</ENTRY>
</COLLECTION>
<PLAYLISTS><NODE TYPE="FOLDER" NAME="$ROOT"><SUBNODES COUNT="1"><NODE TYPE="PLAYLIST" NAME="Night One"><PLAYLIST ENTRIES="2" TYPE="LIST" UUID="abc">
<ENTRY><PRIMARYKEY TYPE="TRACK" KEY="Macintosh HD/:Users/:dj/:Music/:peak.mp3"></PRIMARYKEY></ENTRY>
<ENTRY><PRIMARYKEY TYPE="TRACK" KEY="ROBERT HD2/:Users/:dj/:Music/:intro.mp3"></PRIMARYKEY></ENTRY>
</PLAYLIST></NODE></SUBNODES></NODE></PLAYLISTS>
</NML>`
