export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startExamScheduler } = await import('./lib/course-exam-scheduler');
    startExamScheduler();
    const { startPracticalWorkScheduler } = await import('./lib/practical-work-scheduler');
    startPracticalWorkScheduler();
  }
}
