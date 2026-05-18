  async function getThemeState() {
    return page.evaluate(() => {
      const html = document.documentElement;
      const btn = document.querySelector('button[aria-label="Toggle theme"]');
      const svg = btn?.querySelector("svg");
      // Lucide Sun has circles + lines; Moon has a single path
      const isSun = svg ? (svg.querySelectorAll("circle").length > 0 || svg.querySelectorAll("line").length > 0) : false;
      const computedBg = getComputedStyle(html).getPropertyValue("--bg-base").trim();
      return {
        dataTheme: html.getAttribute("data-theme"),
        isSunIcon: isSun,
        bgBase: computedBg,
        colorScheme: html.style.colorScheme,
      };
    });
  }