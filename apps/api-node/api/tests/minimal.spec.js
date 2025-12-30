
describe('Minimal Contract Matcher Test', () => {
    it('should pass for valid success response', () => {
        const response = {
            status: 200,
            body: {
                success: true,
                meta: { requestId: '123', durationMs: 10 }
            }
        };
        expect(response).toMatchApiContract(200);
    });

    it('should pass for valid error response', () => {
        const response = {
            status: 400,
            body: {
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Bad' },
                meta: { requestId: '123', durationMs: 10 }
            }
        };
        expect(response).toMatchApiContract(400);
    });
});
