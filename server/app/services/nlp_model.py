import logging
import spacy

logger = logging.getLogger(__name__)

# Shared spaCy model singleton — previously resume_parser.py and ats_scorer.py each
# loaded their own copy of en_core_web_sm independently, doubling memory usage.
except OSError:
    logger.warning("Downloading spaCy model en_core_web_sm …")
    import subprocess, sys
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
