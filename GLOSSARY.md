# Notes Over Audio (working name)

A video's transcript treated as a document a person can mark up, where every mark keeps its place in the video's time.

## Language

**Transcript**:
The words spoken in a video, each piece with its time. A video can have more than one, differing in language or in where they came from.
_Avoid_: Subtitles, track

**Passage**:
A span of a Transcript with a start time and an end time.
_Avoid_: Segment, snippet, clip

**Moment**:
A single point in a video's time. It has no words of its own, so it is not a Passage of zero length.
_Avoid_: Timestamp, position

**Highlight**:
A Passage the user has saved, kept with a copy of its words as they read when it was saved. It belongs to the video, not to any one Transcript.
_Avoid_: Annotation, bookmark, clip

**Note**:
Text the user has written, attached either to a Highlight or to a Moment. A Highlight carries at most one Note.
_Avoid_: Comment, annotation
