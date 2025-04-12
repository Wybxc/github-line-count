import GM_fetch from "@trim21/gm-fetch";
import { Octokit, RequestError } from "octokit";
import type {} from "typed-query-selector";
import { badgen, type BadgenOptions } from "badgen";
import humanFormat from "human-format";

const gh_pat = GM_getValue("gh_pat", "");

GM_registerMenuCommand(
  gh_pat ? "Set GitHub PAT (already set)" : "Set GitHub PAT",
  async () => {
    const pat = prompt(
      "To avoid 429 errors, it's recommended to set a GitHub Personal Access Token (PAT) with the access to public repositories. It will also enable stats for private repositories if you provide the necessary permissions.\nEnter your GitHub Personal Access Token (PAT):",
    );
    if (pat) {
      GM_setValue("gh_pat", pat);
      console.log("GitHub PAT has been set successfully.");
      await renderLoc();
    } else {
      console.log("No PAT entered, operation cancelled.");
    }
  },
  {
    id: "set-gh-pat",
    title: "Set GitHub PAT",
  },
);

const githubIcon =
  "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJ3aGl0ZXNtb2tlIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R2l0SHViPC90aXRsZT48cGF0aCBkPSJNMTIgLjI5N2MtNi42MyAwLTEyIDUuMzczLTEyIDEyIDAgNS4zMDMgMy40MzggOS44IDguMjA1IDExLjM4NS42LjExMy44Mi0uMjU4LjgyLS41NzcgMC0uMjg1LS4wMS0xLjA0LS4wMTUtMi4wNC0zLjMzOC43MjQtNC4wNDItMS42MS00LjA0Mi0xLjYxQzQuNDIyIDE4LjA3IDMuNjMzIDE3LjcgMy42MzMgMTcuN2MtMS4wODctLjc0NC4wODQtLjcyOS4wODQtLjcyOSAxLjIwNS4wODQgMS44MzggMS4yMzYgMS44MzggMS4yMzYgMS4wNyAxLjgzNSAyLjgwOSAxLjMwNSAzLjQ5NS45OTguMTA4LS43NzYuNDE3LTEuMzA1Ljc2LTEuNjA1LTIuNjY1LS4zLTUuNDY2LTEuMzMyLTUuNDY2LTUuOTMgMC0xLjMxLjQ2NS0yLjM4IDEuMjM1LTMuMjItLjEzNS0uMzAzLS41NC0xLjUyMy4xMDUtMy4xNzYgMCAwIDEuMDA1LS4zMjIgMy4zIDEuMjMuOTYtLjI2NyAxLjk4LS4zOTkgMy0uNDA1IDEuMDIuMDA2IDIuMDQuMTM4IDMgLjQwNSAyLjI4LTEuNTUyIDMuMjg1LTEuMjMgMy4yODUtMS4yMy42NDUgMS42NTMuMjQgMi44NzMuMTIgMy4xNzYuNzY1Ljg0IDEuMjMgMS45MSAxLjIzIDMuMjIgMCA0LjYxLTIuODA1IDUuNjI1LTUuNDc1IDUuOTIuNDIuMzYuODEgMS4wOTYuODEgMi4yMiAwIDEuNjA2LS4wMTUgMi44OTYtLjAxNSAzLjI4NiAwIC4zMTUuMjEuNjkuODI1LjU3QzIwLjU2NSAyMi4wOTIgMjQgMTcuNTkyIDI0IDEyLjI5N2MwLTYuNjI3LTUuMzczLTEyLTEyLTEyIi8+PC9zdmc+";

function renderBadge(options: BadgenOptions) {
  const badge = badgen(options);
  document.getElementById("github-line-count")?.remove();
  document
    .querySelector(".AppHeader-context-full > nav > ul")
    ?.insertAdjacentHTML(
      "beforeend",
      `<li id="github-line-count" style="margin-left: 0.5em">${badge}</li>`,
    );
}

async function getCodeFrequencyStats(owner: string, repo: string) {
  const gh_pat = GM_getValue("gh_pat", "");
  const octokit = new Octokit({
    auth: gh_pat || undefined,
    request: {
      fetch: GM_fetch,
    },
  });

  while (true) {
    const response = await octokit.rest.repos.getCodeFrequencyStats({
      owner,
      repo,
    });

    if (response.status === 200) {
      return response.data;
    }

    // The response may be 202, in which case we need to wait and retry
    renderBadge({
      label: "Lines",
      status: "Loading...",
      color: "blue",
      icon: githubIcon,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof RequestError) {
    if (error.status === 422) {
      return "Too many commits";
    }
    return `HTTP ${error.status}`;
  }
  return `${error}`.substring(0, 20);
}

async function renderLoc() {
  const owner = document
    .querySelector(".AppHeader-context-full > nav > ul > li:nth-child(1) > a")
    ?.innerText.trim();
  const repository = document
    .querySelector(".AppHeader-context-full > nav > ul > li:nth-child(2) > a")
    ?.innerText.trim();
  if (owner && repository) {
    try {
      const stats = await getCodeFrequencyStats(owner, repository);
      const loc = stats.reduce(
        (acc, [_, additions, deletions]) =>
          acc + (additions ?? 0) + (deletions ?? 0),
        0,
      );

      renderBadge({
        label: "Lines",
        status: humanFormat(loc),
        color: loc < 10000 ? "green" : loc < 100000 ? "orange" : "red",
        icon: githubIcon,
      });
    } catch (error) {
      renderBadge({
        label: "Error",
        status: getErrorMessage(error),
        color: "red",
        icon: githubIcon,
      });
    }
  }
}

await renderLoc();
