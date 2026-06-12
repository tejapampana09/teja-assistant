import type { CommunicationMessage, DailyBriefing, Task } from "../types/domain";
import { formatDate } from "../utils/date";

export function buildDailyBriefing(tasks: Task[], messages: CommunicationMessage[]): DailyBriefing {
  const pendingTasks = tasks.filter((task) => task.status === "active");
  const sortedDueTasks = [...pendingTasks].sort((a, b) =>
    String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"))
  );

  return {
    pendingTasks: pendingTasks.length,
    unreadMessages: messages.filter((message) => message.direction === "incoming").length,
    upcomingDeadline: sortedDueTasks[0] ? `${sortedDueTasks[0].title} - ${formatDate(sortedDueTasks[0].dueDate)}` : "No deadline set",
    studyGoal: "1 Hour DSA",
    importantMessages: messages.slice(0, 5)
  };
}
