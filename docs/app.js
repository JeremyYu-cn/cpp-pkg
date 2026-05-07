const searchInput = document.querySelector("#command-search");
const navEl = document.querySelector("#command-nav");
const listEl = document.querySelector("#command-list");
const countEl = document.querySelector("#command-count");
const versionEl = document.querySelector("#version-label");
const descriptionEl = document.querySelector("#project-description");

const isChinesePage = document.documentElement.lang
  .toLowerCase()
  .startsWith("zh");

const labels = isChinesePage
  ? {
      alias: "\u522b\u540d",
      arguments: "\u53c2\u6570",
      defaultValue: "\u9ed8\u8ba4\u503c",
      description: "\u8bf4\u660e",
      examples: "\u793a\u4f8b",
      flag: "\u6807\u5fd7",
      name: "\u540d\u79f0",
      no: "\u5426",
      noMatches: "\u6ca1\u6709\u5339\u914d\u5f53\u524d\u641c\u7d22\u7684\u547d\u4ee4\u3002",
      options: "\u9009\u9879",
      required: "\u5fc5\u586b",
      subcommands: "\u5b50\u547d\u4ee4",
      toggleSubmenu: "\u5c55\u5f00\u6216\u6536\u8d77\u5b50\u83dc\u5355",
      unableToLoad: "\u65e0\u6cd5\u52a0\u8f7d\u547d\u4ee4\u53c2\u8003\u3002",
      usage: "\u7528\u6cd5",
      yes: "\u662f",
      categoryNames: {
        build: "\u7f16\u8bd1\u6784\u5efa",
        dependencies: "\u4f9d\u8d56\u7ba1\u7406",
        maintenance: "\u7ef4\u62a4\u914d\u7f6e",
        other: "\u5176\u4ed6",
        setup: "\u9879\u76ee\u521d\u59cb\u5316",
      },
      count: (count) => `${count} \u4e2a\u547d\u4ee4`,
      filteredCount: (visible, total) => `${visible} / ${total} \u4e2a\u547d\u4ee4`,
      version: (version) => `\u7248\u672c ${version}`,
    }
  : {
      alias: "alias",
      arguments: "Arguments",
      defaultValue: "Default",
      description: "Description",
      examples: "Examples",
      flag: "Flag",
      name: "Name",
      no: "No",
      noMatches: "No commands match the current search.",
      options: "Options",
      required: "Required",
      subcommands: "Subcommands",
      toggleSubmenu: "Expand or collapse submenu",
      unableToLoad: "Unable to load command reference.",
      usage: "Usage",
      yes: "Yes",
      categoryNames: {
        build: "Build & Compiler",
        dependencies: "Dependency Workflow",
        maintenance: "Maintenance",
        other: "Other",
        setup: "Project Setup",
      },
      count: (count) => `${count} commands`,
      filteredCount: (visible, total) => `${visible} of ${total} commands`,
      version: (version) => `Version ${version}`,
    };

let commandIdsInView = [];
let scrollUpdateQueued = false;

const commandCategories = [
  {
    commands: ["init", "add", "install"],
    key: "setup",
  },
  {
    commands: ["get", "search", "inspect", "list", "status", "update", "remove"],
    key: "dependencies",
  },
  {
    commands: ["compile", "build", "compiler", "cmake"],
    key: "build",
  },
  {
    commands: ["cache", "config"],
    key: "maintenance",
  },
];

const categoryByCommand = new Map(
  commandCategories.flatMap((category) =>
    category.commands.map((command) => [command, category.key]),
  ),
);

function flattenCommands(commands) {
  return commands.flatMap((command) => [
    command,
    ...flattenCommands(command.children || []),
  ]);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function commandId(command) {
  return `command-${command.path.replaceAll(" ", "-")}`;
}

function commandNavLabel(command) {
  return command.name || command.path.split(" ").at(-1) || command.command;
}

function commandTopLevel(command) {
  return command.path.split(" ")[0] || command.path;
}

function commandCategoryKey(command) {
  return categoryByCommand.get(commandTopLevel(command)) || "other";
}

function buildCategoryGroups(commands) {
  const categories = commandCategories.map((category) => ({
    commands: [],
    key: category.key,
    name: labels.categoryNames[category.key],
  }));
  const categoryByKey = new Map(
    categories.map((category) => [category.key, category]),
  );

  for (const command of commands) {
    const key = commandCategoryKey(command);
    let category = categoryByKey.get(key);

    if (!category) {
      category = {
        commands: [],
        key,
        name: labels.categoryNames.other,
      };
      categoryByKey.set(key, category);
      categories.push(category);
    }

    category.commands.push(command);
  }

  return categories.filter((category) => category.commands.length > 0);
}

function buildNavGroups(commands, commandByPath) {
  const groups = [];
  const groupByTopLevel = new Map();

  for (const command of commands) {
    const [topLevel] = command.path.split(" ");

    if (!topLevel) {
      continue;
    }

    let group = groupByTopLevel.get(topLevel);

    if (!group) {
      const parent = commandByPath.get(topLevel) || command;

      group = {
        children: [],
        parent,
        parentVisible: false,
      };
      groupByTopLevel.set(topLevel, group);
      groups.push(group);
    }

    if (command.path === topLevel) {
      group.parent = command;
      group.parentVisible = true;
      continue;
    }

    group.children.push(command);
  }

  return groups;
}

function optionRows(options) {
  if (!options.length) {
    return "";
  }

  return `
    <section>
      <h4>${labels.options}</h4>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${labels.flag}</th>
              <th>${labels.description}</th>
              <th>${labels.defaultValue}</th>
            </tr>
          </thead>
          <tbody>
            ${options
              .map(
                (option) => `
                  <tr>
                    <td><code>${escapeHtml(option.flags)}</code></td>
                    <td>${escapeHtml(option.description)}</td>
                    <td>${escapeHtml(option.defaultValue || "")}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function argumentRows(args) {
  if (!args.length) {
    return "";
  }

  return `
    <section>
      <h4>${labels.arguments}</h4>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${labels.name}</th>
              <th>${labels.description}</th>
              <th>${labels.required}</th>
            </tr>
          </thead>
          <tbody>
            ${args
              .map(
                (argument) => `
                  <tr>
                    <td><code>${escapeHtml(argument.name)}${argument.variadic ? "..." : ""}</code></td>
                    <td>${escapeHtml(argument.description)}</td>
                    <td>${argument.required ? labels.yes : labels.no}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function subcommandLinks(subcommands) {
  if (!subcommands.length) {
    return "";
  }

  return `
    <section>
      <h4>${labels.subcommands}</h4>
      <div class="subcommands">
        ${subcommands
          .map(
            (subcommand) =>
              `<a href="#${commandId(subcommand)}">${escapeHtml(subcommand.command)}</a>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

function exampleBlock(examples) {
  if (!examples.length) {
    return "";
  }

  return `
    <section>
      <h4>${labels.examples}</h4>
      <pre><code>${escapeHtml(examples.join("\n"))}</code></pre>
    </section>
  `;
}

function commandCard(command) {
  const aliases = command.aliases || [];

  return `
    <article class="command-card" id="${commandId(command)}">
      <header>
        <div>
          <h3><code>${escapeHtml(command.command)}</code></h3>
          <p>${escapeHtml(command.description)}</p>
        </div>
        <div class="badge-row">
          ${aliases.map((alias) => `<span class="badge">${labels.alias}: ${escapeHtml(alias)}</span>`).join("")}
        </div>
      </header>
      <div class="command-body">
        <section class="usage">
          <h4>${labels.usage}</h4>
          <pre><code>${escapeHtml(command.usage)}</code></pre>
        </section>
        ${subcommandLinks(command.subcommands || [])}
        ${argumentRows(command.arguments || [])}
        ${optionRows(command.options || [])}
        ${exampleBlock(command.examples || [])}
      </div>
    </article>
  `;
}

function matchesCommand(command, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    command.command,
    command.description,
    command.usage,
    ...(command.aliases || []),
    ...(command.options || []).flatMap((option) => [
      option.flags,
      option.description,
    ]),
    ...(command.examples || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function navLink(command, className = "") {
  return `<a class="nav-link ${className}" href="#${commandId(command)}" data-target="${commandId(command)}" title="${escapeHtml(command.command)}">${escapeHtml(commandNavLabel(command))}</a>`;
}

function navToggle(command, groupId, isParentVisible) {
  const targetAttribute = isParentVisible
    ? ` data-target="${commandId(command)}"`
    : "";

  return `
    <button
      class="nav-toggle parent"
      type="button"
      aria-controls="${groupId}"
      aria-expanded="true"
      aria-label="${labels.toggleSubmenu}"
      data-toggle="${groupId}"
      title="${escapeHtml(command.command)}"
      ${targetAttribute}
    >
      <span class="nav-toggle-label">${escapeHtml(commandNavLabel(command))}</span>
      <span class="nav-toggle-icon" aria-hidden="true">-</span>
    </button>
  `;
}

function renderNavGroup(group) {
  if (!group.children.length) {
    return navLink(group.parent);
  }

  const groupId = `nav-group-${group.parent.path.replaceAll(" ", "-")}`;

  return `
    <div class="nav-group" data-group="${commandId(group.parent)}">
      ${navToggle(group.parent, groupId, group.parentVisible)}
      <div class="nav-children" id="${groupId}">
        ${group.children.map((child) => navLink(child, "child")).join("")}
      </div>
    </div>
  `;
}

function renderNav(commands, commandByPath) {
  navEl.innerHTML = buildCategoryGroups(commands)
    .map(
      (category) => `
        <section class="nav-category">
          <div class="nav-category-title">${escapeHtml(category.name)}</div>
          <div class="nav-category-items">
            ${buildNavGroups(category.commands, commandByPath)
              .map(renderNavGroup)
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function openGroupForEntry(entry) {
  const group = entry.closest(".nav-group");

  if (!group?.classList.contains("collapsed")) {
    return;
  }

  const toggle = group.querySelector(".nav-toggle");
  group.classList.remove("collapsed");
  toggle?.setAttribute("aria-expanded", "true");
  toggle?.querySelector(".nav-toggle-icon")?.replaceChildren("-");
}

function setActiveCommand(id) {
  const currentActive = navEl.querySelector("[data-target].active");

  if (currentActive?.dataset.target === id) {
    openGroupForEntry(currentActive);
    return;
  }

  for (const entry of navEl.querySelectorAll("[data-target]")) {
    const isActive = entry.dataset.target === id;

    entry.classList.toggle("active", isActive);

    if (isActive) {
      entry.setAttribute("aria-current", "true");
      openGroupForEntry(entry);
      entry.scrollIntoView({ block: "nearest" });
    } else {
      entry.removeAttribute("aria-current");
    }
  }
}

function updateActiveCommand() {
  if (!commandIdsInView.length) {
    return;
  }

  const topOffset = 112;
  let activeId = commandIdsInView[0];

  for (const id of commandIdsInView) {
    const element = document.getElementById(id);

    if (!element) {
      continue;
    }

    if (element.getBoundingClientRect().top <= topOffset) {
      activeId = id;
      continue;
    }

    break;
  }

  setActiveCommand(activeId);
}

function requestActiveCommandUpdate() {
  if (scrollUpdateQueued) {
    return;
  }

  scrollUpdateQueued = true;
  window.requestAnimationFrame(() => {
    scrollUpdateQueued = false;
    updateActiveCommand();
  });
}

function renderCommands(commands, commandByPath, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommands = commands.filter((command) =>
    matchesCommand(command, normalizedQuery),
  );

  countEl.textContent =
    visibleCommands.length === commands.length
      ? labels.count(commands.length)
      : labels.filteredCount(visibleCommands.length, commands.length);

  if (!visibleCommands.length) {
    listEl.innerHTML =
      `<div class="empty-state">${labels.noMatches}</div>`;
    renderNav([], commandByPath);
    commandIdsInView = [];
    return;
  }

  listEl.innerHTML = visibleCommands.map(commandCard).join("");
  renderNav(visibleCommands, commandByPath);
  commandIdsInView = visibleCommands.map(commandId);
  updateActiveCommand();
}

async function loadReference() {
  const response = await fetch("commands.json");

  if (!response.ok) {
    throw new Error(`commands.json returned ${response.status}`);
  }

  return response.json();
}

try {
  const reference = await loadReference();
  const commands = flattenCommands(reference.commands || []);
  const commandByPath = new Map(
    commands.map((command) => [command.path, command]),
  );

  document.title = `${reference.name} Commands`;
  versionEl.textContent = labels.version(reference.version);
  descriptionEl.textContent = reference.description;
  renderCommands(commands, commandByPath);

  searchInput.addEventListener("input", () => {
    renderCommands(commands, commandByPath, searchInput.value);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  listEl.innerHTML = `
    <div class="load-error">
      <strong>${labels.unableToLoad}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

navEl.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const toggle = target?.closest("button[data-toggle]");

  if (toggle) {
    const group = toggle.closest(".nav-group");
    const isCollapsed = group?.classList.toggle("collapsed") ?? false;

    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.querySelector(".nav-toggle-icon")?.replaceChildren(
      isCollapsed ? "+" : "-",
    );
    return;
  }

  const link = target?.closest("a[data-target]");

  if (link) {
    setActiveCommand(link.dataset.target);
  }
});

window.addEventListener("scroll", requestActiveCommandUpdate, { passive: true });
window.addEventListener("resize", requestActiveCommandUpdate);
