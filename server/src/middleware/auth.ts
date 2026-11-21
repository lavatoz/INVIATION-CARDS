import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No authorization token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let payload: TokenPayload;

    try {
      payload = verifyToken(token);
    } catch (err) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account associated with token no longer exists.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal authentication error.',
    });
  }
};

/**
 * Middleware ensuring the authenticated user is an OWNER or ADMIN
 */
export const requireOwner = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access restricted to wedding owners.',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if the wedding invitation belongs to the logged in owner
 */
export const checkInvitationOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invitationId = req.params.invitationId || req.params.id;
    const userId = req.user?.id;

    if (!invitationId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Invitation identifier or user context missing.',
      });
      return;
    }

    const invitation = await prisma.weddingInvitation.findUnique({
      where: { id: invitationId },
      select: { id: true, ownerId: true },
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found.',
      });
      return;
    }

    if (invitation.ownerId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access or modify this wedding invitation.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify invitation ownership.',
    });
  }
};
