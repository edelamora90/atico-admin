import { BadRequestException, NotFoundException } from '@nestjs/common';

type ClassSessionLike = {
  id: string;
  classTemplateId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
};

type SessionResolverClient = {
  classSession: {
    findUnique(args: unknown): Promise<ClassSessionLike | null>;
  };
};

export type SessionResolutionSource = 'SESSION';

export type SessionResolutionInput = {
  sessionId?: string | null;
};

export type SessionResolution = {
  sessionId: string | null;
  classTemplateId: string | null;
  session: ClassSessionLike | null;
  isLegacy: boolean;
  source: SessionResolutionSource;
};

export async function resolveSessionId(
  client: SessionResolverClient,
  input: SessionResolutionInput,
): Promise<SessionResolution> {
  if (!input.sessionId) {
    throw new BadRequestException(
      'sessionId es obligatorio para esta operación.',
    );
  }

  const session = await client.classSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session) {
    throw new NotFoundException('Sesión de clase no encontrada');
  }

  return buildSessionResolution(session);
}

function buildSessionResolution(session: ClassSessionLike): SessionResolution {
  return {
    sessionId: session.id,
    classTemplateId: session.classTemplateId,
    session,
    isLegacy: false,
    source: 'SESSION',
  };
}
