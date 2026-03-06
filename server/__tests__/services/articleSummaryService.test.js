/**
 * articleSummaryService tests
 *
 * articleSummaryService.js is CJS and instantiates GoogleGenerativeAI at
 * module load time, so vi.mock('@google/generative-ai') cannot intercept it.
 * We patch require.cache directly before loading the service module.
 */

import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

let generateArticleSummary;
let generateImageAltText;
let generateSlug;

beforeAll(() => {
  // Patch @google/generative-ai in require.cache before the service loads
  const geminiPath = _require.resolve('@google/generative-ai');
  const MockGoogleGenerativeAI = function () {
    this.getGenerativeModel = mockGetGenerativeModel;
  };
  _require.cache[geminiPath] = {
    id: geminiPath,
    filename: geminiPath,
    loaded: true,
    exports: { GoogleGenerativeAI: MockGoogleGenerativeAI },
  };

  // Force fresh load of articleSummaryService with the patched dependency
  const svcPath = _require.resolve('../../services/articleSummaryService.js');
  delete _require.cache[svcPath];
  const svc = _require('../../services/articleSummaryService.js');
  generateArticleSummary = svc.generateArticleSummary;
  generateImageAltText = svc.generateImageAltText;
  generateSlug = svc.generateSlug;
});

function makeTextResponse(text) {
  return {
    response: {
      text: () => text,
    },
  };
}

describe('generateSlug', () => {
  it('converts title to lowercase hyphenated slug', () => {
    const slug = generateSlug('Sydney House Prices Rise');
    expect(slug).toBe('sydney-house-prices-rise');
  });

  it('removes non-alphanumeric characters', () => {
    const slug = generateSlug('Property: What\'s Next?');
    expect(slug).toBe('property-what-s-next');
  });

  it('collapses multiple hyphens', () => {
    const slug = generateSlug('A --- B');
    expect(slug).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    const slug = generateSlug('--Leading and trailing--');
    expect(slug).toBe('leading-and-trailing');
  });

  it('truncates at 100 characters', () => {
    const longTitle = 'A'.repeat(150);
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(100);
  });
});

describe('generateArticleSummary', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
    mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent });
  });

  it('returns parsed summary from Gemini response', async () => {
    const geminiResponse = {
      shortBlurb: 'Sydney property prices are rising.',
      longSummary: 'A detailed look at why prices are climbing in 2024.',
      suggestedCategory: 'residential',
      extractedLocation: 'Sydney, NSW',
    };
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(JSON.stringify(geminiResponse)));

    const result = await generateArticleSummary({
      title: 'Sydney Prices Up',
      content: 'Detailed content about Sydney property prices going up significantly in Q1 2024.',
      sourceName: 'Domain',
    });

    expect(result).toMatchObject({
      shortBlurb: 'Sydney property prices are rising.',
      longSummary: 'A detailed look at why prices are climbing in 2024.',
      suggestedCategory: 'residential',
      extractedLocation: 'Sydney, NSW',
    });
  });

  it('strips markdown code fences from response', async () => {
    const geminiResponse = {
      shortBlurb: 'Blurb here.',
      longSummary: 'Long summary.',
      suggestedCategory: 'finance',
      extractedLocation: null,
    };
    const responseText = '```json\n' + JSON.stringify(geminiResponse) + '\n```';
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(responseText));

    const result = await generateArticleSummary({
      title: 'Finance Article',
      content: 'Some content that is longer than fifty characters in total.',
      sourceName: 'AFR',
    });

    expect(result.suggestedCategory).toBe('finance');
  });

  it('strips plain code fences from response', async () => {
    const geminiResponse = {
      shortBlurb: 'Blurb.',
      longSummary: 'Summary.',
      suggestedCategory: 'investment',
      extractedLocation: 'Melbourne, VIC',
    };
    const responseText = '```\n' + JSON.stringify(geminiResponse) + '\n```';
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(responseText));

    const result = await generateArticleSummary({
      title: 'Investment Article',
      content: 'Some content here that is definitely longer than fifty characters total.',
      sourceName: 'AFR',
    });

    expect(result.suggestedCategory).toBe('investment');
  });

  it('defaults invalid category to uncategorized', async () => {
    const geminiResponse = {
      shortBlurb: 'Blurb.',
      longSummary: 'Summary.',
      suggestedCategory: 'random-invalid-category',
      extractedLocation: null,
    };
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(JSON.stringify(geminiResponse)));

    const result = await generateArticleSummary({
      title: 'Test',
      content: 'Content that exceeds fifty characters in length for this test case here.',
      sourceName: 'Source',
    });

    expect(result.suggestedCategory).toBe('uncategorized');
  });

  it('accepts all valid category slugs', async () => {
    const validCategories = ['property-market', 'residential', 'commercial', 'investment', 'development', 'policy', 'finance', 'uncategorized'];

    for (const cat of validCategories) {
      mockGenerateContent.mockResolvedValueOnce(makeTextResponse(JSON.stringify({
        shortBlurb: 'B',
        longSummary: 'S',
        suggestedCategory: cat,
        extractedLocation: null,
      })));

      const result = await generateArticleSummary({
        title: 'T',
        content: 'Content that is definitely longer than fifty characters total here for test.',
        sourceName: 'S',
      });

      expect(result.suggestedCategory).toBe(cat);
    }
  });

  it('returns empty strings for missing blurb and summary fields', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(JSON.stringify({
      suggestedCategory: 'uncategorized',
      extractedLocation: null,
    })));

    const result = await generateArticleSummary({
      title: 'Test',
      content: 'Content that is definitely longer than fifty characters total here.',
      sourceName: 'Source',
    });

    expect(result.shortBlurb).toBe('');
    expect(result.longSummary).toBe('');
  });

  it('throws when Gemini response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse('This is not JSON at all'));

    await expect(generateArticleSummary({
      title: 'Test',
      content: 'Content that is definitely longer than fifty characters total here.',
      sourceName: 'Source',
    })).rejects.toThrow('Failed to parse Gemini response as JSON');
  });

  it('falls back to gemini-2.0-flash when exp model not found', async () => {
    const notFoundError = new Error('models/gemini-2.0-flash-exp is not found');
    mockGenerateContent
      .mockRejectedValueOnce(notFoundError)
      .mockResolvedValueOnce(makeTextResponse(JSON.stringify({
        shortBlurb: 'Fallback blurb.',
        longSummary: 'Fallback summary.',
        suggestedCategory: 'policy',
        extractedLocation: 'Victoria',
      })));

    const result = await generateArticleSummary({
      title: 'Test',
      content: 'Content that is definitely longer than fifty characters total here for fallback test.',
      sourceName: 'Source',
    });

    expect(result.suggestedCategory).toBe('policy');
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2);
  });

  it('throws Gemini API error for non-"not found" errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Quota exceeded'));

    await expect(generateArticleSummary({
      title: 'Test',
      content: 'Content that is definitely longer than fifty characters here.',
      sourceName: 'Source',
    })).rejects.toThrow('Gemini API error during summarisation: Quota exceeded');
  });

  it('uses title-only prompt when content is short', async () => {
    const geminiResponse = {
      shortBlurb: 'Short content blurb.',
      longSummary: 'Summary from title only.',
      suggestedCategory: 'uncategorized',
      extractedLocation: null,
    };
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse(JSON.stringify(geminiResponse)));

    const result = await generateArticleSummary({
      title: 'Short',
      content: 'Tiny',
      sourceName: 'Source',
    });

    expect(result.shortBlurb).toBe('Short content blurb.');
    const promptArg = mockGenerateContent.mock.calls[0][0];
    expect(promptArg).toContain('Full article content not available');
  });
});

describe('generateImageAltText', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
    mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent });
  });

  it('returns trimmed alt text from Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse('  Aerial view of Sydney CBD property development  '));

    const result = await generateImageAltText(
      'Sydney Development Approved',
      'A major new development in Sydney CBD has been approved.',
      ['Sydney', 'development']
    );

    expect(result).toBe('Aerial view of Sydney CBD property development');
  });

  it('strips surrounding quotes from alt text', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse('"Sydney property market graph"'));

    const result = await generateImageAltText('Test', 'Summary', []);
    expect(result).toBe('Sydney property market graph');
  });

  it('throws on Gemini API error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Model unavailable'));

    await expect(generateImageAltText('Title', 'Summary', [])).rejects.toThrow('Alt text generation failed: Model unavailable');
  });

  it('works with empty keywords array', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeTextResponse('Property image'));

    const result = await generateImageAltText('Title', 'Summary text here', []);
    expect(result).toBe('Property image');
  });
});
