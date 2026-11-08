import type { Delivery } from '@/types';
import { getTeacherDeliveryState } from '@/lib/delivery-workflow';

export const reviewFilters = ['all', 'unreviewed', 'pending', 'resubmitted', 'draft', 'published'] as const;
export type ReviewFilter = typeof reviewFilters[number];
export type ReviewContext = { query: string; filter: ReviewFilter };
export type ReviewSearchParams = Record<string, string | string[] | undefined>;

export function parseReviewContext(params: ReviewSearchParams = {}): ReviewContext {
  const filter = typeof params.reviewState === 'string' ? params.reviewState : '';
  return {
    query: typeof params.reviewQuery === 'string' ? params.reviewQuery : '',
    filter: reviewFilters.includes(filter as ReviewFilter) ? filter as ReviewFilter : 'all',
  };
}

export function reviewStatus(delivery: Delivery) {
  const state = getTeacherDeliveryState(delivery);
  return state === 'pending' || state === 'resubmitted' || state === 'draft' ? state : 'published';
}

export function matchesReview(delivery: Delivery, context: ReviewContext) {
  const state = reviewStatus(delivery);
  if (context.filter === 'unreviewed' ? state === 'published' : context.filter !== 'all' && state !== context.filter) return false;
  const student = delivery.expand?.student;
  const identity = [student?.name, student?.firstName, student?.lastName, student?.email].filter(Boolean).join(' ').toLocaleLowerCase('es');
  return !context.query.trim() || identity.includes(context.query.trim().toLocaleLowerCase('es'));
}

export function reviewSearch(context: ReviewContext) {
  const params = new URLSearchParams();
  if (context.query) params.set('reviewQuery', context.query);
  if (context.filter !== 'all') params.set('reviewState', context.filter);
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function deliveryReviewHref(assignmentId: string, deliveryId: string, context: ReviewContext = { query: '', filter: 'all' }) {
  return `/assignments/${assignmentId}/deliveries/${deliveryId}${reviewSearch(context)}`;
}

// Keep the current delivery as an anchor after publishing changes its filter state.
export function reviewQueue(deliveries: Delivery[], assignmentId: string, currentId: string, context: ReviewContext) {
  return deliveries.filter(delivery => delivery.assignment === assignmentId && (delivery.id === currentId || matchesReview(delivery, context)));
}
