// Marks a User as an Admin. Users have no names, so find yours by Byline and when you joined.
//   npm run admin -- list
//   npm run admin -- grant <user id>
import { getApp } from "@/composition";

const [command, userId] = process.argv.slice(2);
const { operator } = await getApp();

if (command === "list") {
  const users = await operator.listUsers();
  if (users.length === 0) console.log("Nobody has logged in yet.");
  for (const user of users) {
    console.log(`${user.userId}  ${user.byline.padEnd(14)}  joined ${user.joinedAt.toISOString()}${user.isAdmin ? "  (Admin)" : ""}`);
  }
} else if (command === "grant" && userId) {
  const done = await operator.makeAdmin(userId);
  console.log(done ? "Done. They are an Admin from their next page load." : "No User has that ID. Run `npm run admin -- list` to see them.");
  if (!done) process.exit(1);
} else {
  console.error("Usage: npm run admin -- list | npm run admin -- grant <user id>");
  process.exit(1);
}
