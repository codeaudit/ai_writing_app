'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

function hasMessage(value: unknown): value is { message: string } {
	return typeof value === 'object' && value !== null && 'message' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).message === 'string';
}

function isBenignError(reason: unknown): boolean {
	if (!reason) return false;
	const message = typeof reason === 'string' ? reason : hasMessage(reason) ? reason.message : '';
	return (
		message.includes('AbortError') ||
		message.includes('Failed to fetch') ||
		message.includes('NetworkError') ||
		message.includes('The user aborted a request') ||
		message.includes('The operation was aborted')
	);
}

export function ErrorListener() {
	useEffect(() => {
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			// Always prevent default to stop Next overlay
			event.preventDefault();
			const benign = isBenignError(reason);
			if (!benign && process.env.NODE_ENV === 'development') {
				// Use debug to avoid triggering overlay hooks
				// eslint-disable-next-line no-console
				console.debug('Unhandled rejection (suppressed):', reason);
				toast.error('An error occurred. See console for details.');
			}
		};

		const handleError = (event: ErrorEvent) => {
			// Always prevent default to stop overlay
			event.preventDefault();
			if (process.env.NODE_ENV === 'development') {
				// eslint-disable-next-line no-console
				console.debug('Global error (suppressed):', event.message);
			}
		};

		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);
		return () => {
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
			window.removeEventListener('error', handleError);
		};
	}, []);

	return null;
} 