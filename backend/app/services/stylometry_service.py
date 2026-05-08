import spacy
import textstat
from collections import Counter

nlp = spacy.load("en_core_web_sm")


class StylometryService:
    """Extracts 12 stylometric features from a list of text samples."""

    def analyze(self, texts: list[str]) -> dict:
        combined = " ".join(texts)
        doc = nlp(combined)
        sentences = list(doc.sents)
        words = [t.text for t in doc if t.is_alpha]

        return {
            "avg_sentence_length": self._avg_sentence_length(sentences),
            "avg_word_length": self._avg_word_length(words),
            "type_token_ratio": self._type_token_ratio(words),
            "passive_voice_ratio": self._passive_ratio(doc),
            "flesch_reading_ease": round(textstat.flesch_reading_ease(combined), 2),
            "flesch_kincaid_grade": round(textstat.flesch_kincaid_grade(combined), 2),
            "top_punctuation": self._punct_profile(combined),
            "conjunction_frequency": self._pos_frequency(doc, "CCONJ"),
            "adverb_frequency": self._pos_frequency(doc, "ADV"),
            "first_person_ratio": self._first_person_ratio(words),
            "paragraph_length_avg": self._avg_paragraph_length(texts),
            "transition_word_ratio": self._transition_ratio(words),
        }

    def _avg_sentence_length(self, sentences) -> float:
        if not sentences:
            return 0.0
        return round(sum(len(list(s)) for s in sentences) / len(sentences), 2)

    def _avg_word_length(self, words) -> float:
        if not words:
            return 0.0
        return round(sum(len(w) for w in words) / len(words), 2)

    def _type_token_ratio(self, words) -> float:
        if not words:
            return 0.0
        return round(len(set(w.lower() for w in words)) / len(words), 3)

    def _passive_ratio(self, doc) -> float:
        passive = sum(1 for t in doc if t.dep_ == "auxpass")
        verbs = sum(1 for t in doc if t.pos_ == "VERB")
        return round(passive / verbs, 3) if verbs else 0.0

    def _punct_profile(self, text: str) -> dict:
        counts = Counter(c for c in text if c in ".,;:!?-—")
        total = sum(counts.values()) or 1
        return {k: round(v / total, 3) for k, v in counts.most_common(5)}

    def _pos_frequency(self, doc, pos: str) -> float:
        total = len(list(doc))
        count = sum(1 for t in doc if t.pos_ == pos)
        return round(count / total, 3) if total else 0.0

    def _first_person_ratio(self, words: list) -> float:
        fp = {"i", "me", "my", "mine", "myself", "we", "us", "our", "ours"}
        count = sum(1 for w in words if w.lower() in fp)
        return round(count / len(words), 3) if words else 0.0

    def _avg_paragraph_length(self, texts: list) -> float:
        paras = [p for t in texts for p in t.split("\n\n") if p.strip()]
        if not paras:
            return 0.0
        return round(sum(len(p.split()) for p in paras) / len(paras), 2)

    def _transition_ratio(self, words: list) -> float:
        transitions = {
            "however", "therefore", "furthermore", "moreover",
            "nevertheless", "consequently", "additionally", "thus",
        }
        count = sum(1 for w in words if w.lower() in transitions)
        return round(count / len(words), 3) if words else 0.0
