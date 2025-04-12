import GM_fetch from "@trim21/gm-fetch";
import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import type {} from "typed-query-selector";
import { badgen, type BadgenOptions } from "badgen";
import humanFormat from "human-format";

const gh_pat = GM_getValue("gh_pat", "");

GM_registerMenuCommand(
  gh_pat ? "Set GitHub PAT (already set ✅)" : "Set GitHub PAT",
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
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/stats/code_frequency",
      {
        owner,
        repo,
      },
    );

    if (response.status === 200) {
      return response.data;
    }

    // The response may be 202, in which case we need to wait and retry
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function getFileTreeList(owner: string, repo: string, branch: string) {
  const gh_pat = GM_getValue("gh_pat", "");
  const octokit = new Octokit({
    auth: gh_pat || undefined,
    request: {
      fetch: GM_fetch,
    },
  });

  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: branch,
      recursive: "1",
    },
  );
  return response.data.tree.filter(
    (file: { type: string }) => file.type === "tree",
  );
}

async function queryLineCount(
  owner: string,
  repo: string,
  treePaths: string[],
) {
  const gh_pat = GM_getValue("gh_pat", "");
  const octokit = new Octokit({
    auth: gh_pat || undefined,
    request: {
      fetch: GM_fetch,
    },
  });

  const queries = treePaths
    .map(
      (path, i) => `file${i}: object(expression: "HEAD:${path}") {
                        ... on Tree {
                            entries {
                                lineCount
                            }
                        }
                    }`,
    )
    .join("\n");

  const response = (await octokit.graphql(
    `query ($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                ${queries}
            }
        }`,
    {
      owner,
      repo,
    },
  )) as {
    repository: {
      [key: string]: {
        entries: Array<{
          lineCount: number;
        }>;
      };
    };
  };

  return Object.values(response.repository)
    .flatMap(({ entries }) => entries)
    .reduce((acc, entry) => acc + entry.lineCount, 0);
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
  if (document.getElementById("github-line-count")) {
    return;
  }

  const owner = document
    .querySelector(".AppHeader-context-full > nav > ul > li:nth-child(1) > a")
    ?.innerText.trim();
  const repository = document
    .querySelector(".AppHeader-context-full > nav > ul > li:nth-child(2) > a")
    ?.innerText.trim();
  const branch = document
    .querySelector("button#branch-picker-repos-header-ref-selector")
    ?.innerText.trim();

  if (!owner || !repository || !branch) {
    return;
  }

  renderBadge({
    label: "Lines",
    status: "Loading...",
    color: "gray",
    icon: githubIcon,
  });

  // Check cache first
  const repoKey = `${owner}/${repository}`;
  const cachedLoc = GM_getValue(`${repoKey}/loc`, -1);
  const lastUpdated = GM_getValue(`${repoKey}/lastUpdated`, 0) as number;
  const oneHour = 60 * 60 * 1000;

  if (Date.now() - lastUpdated < oneHour && cachedLoc >= 0) {
    renderBadge({
      label: "Lines",
      status: humanFormat(cachedLoc),
      color:
        cachedLoc < 10000 ? "green" : cachedLoc < 100000 ? "orange" : "red",
      icon: githubIcon,
    });
    return;
  }

  let loc = -1;

  // Try to get line count from file tree first
  try {
    const tree = await getFileTreeList(owner, repository, branch);
    loc = await queryLineCount(
      owner,
      repository,
      tree.map((file) => file.path),
    );
  } catch (error) {
    console.error("Error getting line count from file tree:", error);

    // Fallback to code frequency stats
    try {
      const stats = await getCodeFrequencyStats(owner, repository);
      loc = stats.reduce(
        (acc, [_, additions, deletions]) =>
          acc + (additions ?? 0) + (deletions ?? 0),
        0,
      );
    } catch (fallbackError) {
      renderBadge({
        label: "Error",
        status: getErrorMessage(fallbackError),
        color: "red",
        icon: githubIcon,
      });
      console.error("Error getting code frequency stats:", fallbackError);
      return;
    }
  }

  // Cache the result and display if we got a valid line count
  if (loc >= 0) {
    GM_setValue(`${repoKey}/loc`, loc);
    GM_setValue(`${repoKey}/lastUpdated`, Date.now());

    renderBadge({
      label: "Lines",
      status: humanFormat(loc),
      color: loc < 10000 ? "green" : loc < 100000 ? "orange" : "red",
      icon: githubIcon,
    });
  }
}

await renderLoc();

// Observe for navigation changes
new MutationObserver(renderLoc).observe(document.body, {
  childList: true,
});
