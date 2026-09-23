import { BadRequestException } from '@nestjs/common';
import { Department } from './department.enum';
import { LocalAiIntakeProvider } from './ai-intake.provider';
import { OpenAiIntakeProvider } from './openai-intake.provider';
import { RequestsService } from './requests.service';

describe('AI intake representative evaluations', () => {
  const provider = new LocalAiIntakeProvider();

  it.each([
    ['My laptop will not turn on', Department.IT, false, 'high'],
    ['Please grant me VPN access', Department.IT, false, 'high'],
    ['I need an employment letter', Department.HR, false, 'high'],
    ['How do I update my benefits?', Department.HR, false, 'high'],
    ['I need to submit my letter of resignation', Department.HR, false, 'high'],
    ['I need to talk about my salary', Department.HR, false, 'high'],
    ['I need approval for a work expense', Department.FINANCE, true, 'high'],
    ['Please reimburse this invoice', Department.FINANCE, true, 'high'],
    ['I need a financial bill for my insurance', Department.FINANCE, true, 'high'],
    ['I need help with something', null, false, 'high'],
  ])('maps %s to bounded product context', async (text, department, requiresApproval, confidence) => {
    await expect(provider.classify(text)).resolves.toMatchObject({
      department,
      requiresApproval,
      confidence,
    });
  });

  it('returns a stable structured result for the same input', async () => {
    const first = await provider.classify('My laptop will not turn on');
    const second = await provider.classify('My laptop will not turn on');
    expect(second).toEqual(first);
  });
});

describe('AI intake product-owned validation', () => {
  const repo = {
    create: jest.fn((data: any) => data),
    save: jest.fn(async (data: any) => ({ ...data, id: 'test-id' })),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const events = { create: jest.fn((data: any) => data), save: jest.fn() };

  it('rejects a provider result that violates the approval rule', async () => {
    const invalidProvider = {
      classify: jest.fn(async () => ({
        title: 'Expense approval',
        department: Department.FINANCE,
        requiresApproval: false,
        confidence: 'high' as const,
        rationale: 'invalid test result',
      })),
    };
    const service = new RequestsService(repo as any, events as any, invalidProvider);

    await expect(service.suggestFromFreeText('Expense approval')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates provider failure instead of inventing a candidate', async () => {
    const providerFailure = new Error('provider unavailable');
    const failingProvider = { classify: jest.fn().mockRejectedValue(providerFailure) };
    const service = new RequestsService(repo as any, events as any, failingProvider);

    await expect(service.suggestFromFreeText('Laptop problem')).rejects.toBe(providerFailure);
  });
});

describe('OpenAI-compatible provider transport', () => {
  it('accepts fenced JSON and omits optional response_format for model compatibility', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"title":"Laptop issue","department":"IT","requiresApproval":false,"confidence":"high","rationale":"Technical support"}\n```' } }],
      }),
    } as Response);

    try {
      const provider = new OpenAiIntakeProvider({
        apiKey: 'test-key',
        model: 'google/gemma-4-31b-it',
        baseUrl: 'https://router.requesty.ai/v1',
      });
      await expect(provider.classify('Laptop issue')).resolves.toMatchObject({ department: Department.IT });

      const options = fetchMock.mock.calls[0][1];
      expect(JSON.parse(String(options?.body))).not.toHaveProperty('response_format');
    } finally {
      fetchMock.mockRestore();
    }
  });
});