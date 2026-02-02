#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.gitall.json');

program
  .name('gitall')
  .description('Run git commands across multiple repositories')
  .version('1.0.0');

program
  .command('status')
  .alias('st')
  .description('Show status of all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    showStatus(repos);
  });

program
  .command('pull')
  .description('Pull all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    runCommand(repos, 'git pull');
  });

program
  .command('fetch')
  .description('Fetch all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    runCommand(repos, 'git fetch --all');
  });

program
  .command('run <command...>')
  .description('Run arbitrary git command in all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((command, options) => {
    const repos = findRepos(options.dir);
    const cmd = `git ${command.join(' ')}`;
    runCommand(repos, cmd);
  });

program
  .command('dirty')
  .description('Show only repos with uncommitted changes')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    showDirty(repos);
  });

program
  .command('ahead')
  .description('Show repos ahead of remote')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    showAhead(repos);
  });

program
  .command('commit <message>')
  .description('Commit all changes in all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((message, options) => {
    const repos = findRepos(options.dir);
    runCommand(repos, `git add -A && git commit -m "${message}"`);
  });

program
  .command('push')
  .description('Push all repos')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    runCommand(repos, 'git push');
  });

program
  .command('list')
  .alias('ls')
  .description('List all git repositories')
  .option('-d, --dir <directory>', 'Base directory', '~/projects')
  .action((options) => {
    const repos = findRepos(options.dir);
    console.log(chalk.bold(`\n📁 Git Repositories (${repos.length})\n`));
    for (const repo of repos) {
      console.log(`  ${chalk.cyan(path.basename(repo))}`);
      console.log(chalk.dim(`    ${repo}`));
    }
    console.log();
  });

function findRepos(baseDir) {
  const dir = baseDir.replace(/^~/, os.homedir());
  const repos = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const repoPath = path.join(dir, entry.name);
        const gitPath = path.join(repoPath, '.git');
        if (fs.existsSync(gitPath)) {
          repos.push(repoPath);
        }
      }
    }
  } catch (err) {
    console.error(chalk.red(`Error reading ${dir}: ${err.message}`));
  }
  
  return repos.sort();
}

function showStatus(repos) {
  console.log(chalk.bold(`\n📊 Repository Status\n`));
  
  for (const repo of repos) {
    const name = path.basename(repo);
    
    try {
      const status = execSync('git status --porcelain', { cwd: repo, encoding: 'utf-8' }).trim();
      const branch = execSync('git branch --show-current', { cwd: repo, encoding: 'utf-8' }).trim();
      
      let ahead = 0, behind = 0;
      try {
        const tracking = execSync('git rev-list --left-right --count HEAD...@{u} 2>/dev/null', { cwd: repo, encoding: 'utf-8', shell: true }).trim();
        [ahead, behind] = tracking.split('\t').map(Number);
      } catch {}
      
      const hasChanges = status.length > 0;
      const lines = status ? status.split('\n').length : 0;
      
      const icon = hasChanges ? chalk.yellow('●') : chalk.green('✓');
      const branchStr = chalk.cyan(branch);
      const changesStr = hasChanges ? chalk.yellow(` +${lines}`) : '';
      const syncStr = ahead > 0 ? chalk.green(` ↑${ahead}`) : behind > 0 ? chalk.red(` ↓${behind}`) : '';
      
      console.log(`${icon} ${chalk.bold(name)} ${branchStr}${changesStr}${syncStr}`);
    } catch (err) {
      console.log(`${chalk.red('✗')} ${chalk.bold(name)} ${chalk.red('(error)')}`);
    }
  }
  console.log();
}

function showDirty(repos) {
  console.log(chalk.bold(`\n🔧 Dirty Repositories\n`));
  
  let count = 0;
  for (const repo of repos) {
    const name = path.basename(repo);
    
    try {
      const status = execSync('git status --porcelain', { cwd: repo, encoding: 'utf-8' }).trim();
      
      if (status) {
        count++;
        const lines = status.split('\n');
        console.log(chalk.yellow(`● ${name}`));
        for (const line of lines.slice(0, 5)) {
          console.log(chalk.dim(`    ${line}`));
        }
        if (lines.length > 5) {
          console.log(chalk.dim(`    ... and ${lines.length - 5} more`));
        }
        console.log();
      }
    } catch {}
  }
  
  if (count === 0) {
    console.log(chalk.green('All repositories are clean! 🎉'));
  }
}

function showAhead(repos) {
  console.log(chalk.bold(`\n⬆️ Repos Ahead of Remote\n`));
  
  let count = 0;
  for (const repo of repos) {
    const name = path.basename(repo);
    
    try {
      const tracking = execSync('git rev-list --left-right --count HEAD...@{u}', { cwd: repo, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      const [ahead] = tracking.split('\t').map(Number);
      
      if (ahead > 0) {
        count++;
        console.log(`${chalk.green('↑')} ${chalk.bold(name)} ${chalk.green(`+${ahead} commit(s)`)}`);
        
        const commits = execSync(`git log --oneline @{u}..HEAD`, { cwd: repo, encoding: 'utf-8' }).trim();
        for (const line of commits.split('\n').slice(0, 3)) {
          console.log(chalk.dim(`    ${line}`));
        }
        console.log();
      }
    } catch {}
  }
  
  if (count === 0) {
    console.log(chalk.dim('No repos ahead of remote.'));
  }
}

function runCommand(repos, cmd) {
  console.log(chalk.bold(`\n🚀 Running: ${cmd}\n`));
  
  for (const repo of repos) {
    const name = path.basename(repo);
    console.log(chalk.cyan(`→ ${name}`));
    
    try {
      const result = execSync(cmd, { cwd: repo, encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
      if (result.trim()) {
        console.log(chalk.dim(result.trim()));
      }
      console.log(chalk.green('  ✓'));
    } catch (err) {
      console.log(chalk.red(`  ✗ ${err.message.split('\n')[0]}`));
    }
  }
  console.log();
}

program.parse();
