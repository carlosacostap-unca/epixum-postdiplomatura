const targets = [
  { name: 'review_bookings', field: 'updateRule', previous: 'slot.endsAt <= @now', next: 'slot.startsAt <= @now' },
  { name: 'review_booking_notes', field: 'createRule', previous: 'booking.slot.endsAt <= @now', next: 'booking.slot.startsAt <= @now' },
];

export async function applyReviewEvaluationTimingSchema(pb) {
  // Validate every target before writing; preserve all other conditions and metadata.
  const updates = await Promise.all(targets.map(async target => {
    const collection = await pb.collections.getOne(target.name);
    const rule = collection[target.field];
    if (typeof rule !== 'string') throw new Error(`Regla inesperada en ${target.name}.${target.field}.`);
    const occurrences = rule.split(target.previous).length - 1;
    if (occurrences === 0 && rule.includes(target.next)) return null;
    if (occurrences !== 1) throw new Error(`Regla temporal inesperada en ${target.name}.${target.field}.`);
    return { id: collection.id, field: target.field, rule: rule.replace(target.previous, target.next) };
  }));
  for (const update of updates) {
    if (update) await pb.collections.update(update.id, { [update.field]: update.rule });
  }
}
