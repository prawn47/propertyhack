import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

const mockGenerateImage = vi.fn();
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();

const mockPrisma = {
  systemPrompt: { findFirst: vi.fn() },
  $disconnect: vi.fn(),
};

// Patch aiProviderService
const aiProviderPath = _require.resolve('../../services/aiProviderService.js');
_require.cache[aiProviderPath] = {
  id: aiProviderPath,
  filename: aiProviderPath,
  loaded: true,
  exports: { generateImage: mockGenerateImage },
};

// Patch fs/promises
const fsPath = _require.resolve('fs/promises');
_require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: { mkdir: mockMkdir, writeFile: mockWriteFile },
};

// Patch @prisma/client
const prismaClientPath = _require.resolve('@prisma/client');
_require.cache[prismaClientPath] = {
  id: prismaClientPath,
  filename: prismaClientPath,
  loaded: true,
  exports: { PrismaClient: function () { return mockPrisma; } },
};

// Force fresh load
const svcPath = _require.resolve('../../services/imagenService.js');
delete _require.cache[svcPath];
const imagenService = _require('../../services/imagenService.js');

describe('imagenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockPrisma.systemPrompt.findFirst.mockResolvedValue(null);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
  });

  describe('generateNewsletterImage', () => {
    it('calls aiProviderService.generateImage with styled prompt', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      mockGenerateImage.mockResolvedValue({ imageData: imageBuffer, mimeType: 'image/png' });

      const result = await imagenService.generateNewsletterImage('A modern apartment building');

      expect(mockGenerateImage).toHaveBeenCalledWith(
        'newsletter-image',
        expect.stringContaining('Professional editorial illustration')
      );
      expect(mockGenerateImage).toHaveBeenCalledWith(
        'newsletter-image',
        expect.stringContaining('A modern apartment building')
      );
      expect(result.imageData).toEqual(imageBuffer);
      expect(result.mimeType).toBe('image/png');
    });
  });

  describe('saveImage', () => {
    it('writes file and returns URL', async () => {
      const imageBuffer = Buffer.from('image-data');

      const url = await imagenService.saveImage(imageBuffer, 'draft-123');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('newsletters'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('draft-123.png'),
        imageBuffer
      );
      expect(url).toBe('/images/newsletters/draft-123.png');
    });
  });

  describe('generateHeroImage', () => {
    it('orchestrates the full flow', async () => {
      const imageBuffer = Buffer.from('hero-image');
      mockGenerateImage.mockResolvedValue({ imageData: imageBuffer, mimeType: 'image/png' });

      const url = await imagenService.generateHeroImage('nl-1', 'Big News Today', 'Housing market update');

      expect(mockGenerateImage).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(url).toBe('/images/newsletters/nl-1.png');
    });

    it('returns null on error', async () => {
      mockGenerateImage.mockRejectedValue(new Error('AI service unavailable'));

      const url = await imagenService.generateHeroImage('nl-2', 'Subject', 'Theme');

      expect(url).toBeNull();
    });
  });
});
