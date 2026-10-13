"""Run with: python -m unittest discover -s tools -p 'test_*.py'."""
import unittest
from build import essay_prose


class EssayProseTests(unittest.TestCase):
    def test_prompt_directions_and_lines_stay_literal(self):
        self.assertEqual(
            essay_prose('[Extended instrumental guitar introduction]\n[Key: F# blues, slow 12/8]\n\n[Verse 1]\n...'),
            '<p>[Extended instrumental guitar introduction]<br>\n[Key: F# blues, slow 12/8]</p>\n<p>[Verse 1]<br>\n...</p>')

    def test_link_punctuation_and_bold(self):
        self.assertEqual(
            essay_prose('**Listen** [Video](https://www.youtube.com/watch?v=KC5H9P4F5Uk).'),
            '<p><strong>Listen</strong> <a href="https://www.youtube.com/watch?v=KC5H9P4F5Uk">Video</a>.</p>')

    def test_html_and_unsafe_links_are_not_executed(self):
        result = essay_prose('<script>alert(1)</script> [bad](javascript:alert)\n[quote](https://example.com/"x?a=1&b=2)')
        self.assertNotIn('<script>', result)
        self.assertNotIn('href="javascript:', result)
        self.assertIn('href="https://example.com/&quot;x?a=1&amp;b=2"', result)

    def test_existing_plain_prose(self):
        self.assertEqual(essay_prose('Music & art.\n\nAnother paragraph.'), '<p>Music &amp; art.</p>\n<p>Another paragraph.</p>')


if __name__ == '__main__':
    unittest.main()
