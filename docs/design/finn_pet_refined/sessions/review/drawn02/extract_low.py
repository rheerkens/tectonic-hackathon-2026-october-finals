"""Register the low arm drawing using the same source preserving region."""
import json
from PIL import Image
from extract_pair import HERE, prepare

record = prepare(Image.open(HERE / 'raw_low.png').convert('RGBA'), 'arm_low')
(HERE / 'low_extraction.json').write_text(json.dumps(record,indent=2))
print(json.dumps(record))
