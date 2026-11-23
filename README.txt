Paylalo how-to videos
=====================

One short video per feature. 1920x1080 MP4 with a spoken voiceover. Each video has a
title card, one step per screen (app screen on the left, what to tap on the right, read
aloud), and a closing card.

Built from _source/features.json with _source/build.mjs (HyperFrames). Voice: Piper
(offline, en_US lessac). To change a step, edit features.json and run
  node build.mjs --render --only=<slug>

Screens come from the app design screenshots, so a few may differ slightly from the
live app.

01-face-scan-clock-in.mp4
    Title:   Clock in with Face Scan
    For:     Every employee
    Steps:   6
    Length:  63 s

02-register-your-face.mp4
    Title:   Register your face
    For:     Every employee
    Steps:   4
    Length:  47 s

03-file-a-request.mp4
    Title:   File a request
    For:     Every employee
    Steps:   6
    Length:  71 s

04-approve-requests.mp4
    Title:   Approve or reject requests
    For:     Owner, Admin, Manager
    Steps:   5
    Length:  52 s

05-attendance.mp4
    Title:   Check your attendance
    For:     Every employee
    Steps:   5
    Length:  50 s

06-payslip.mp4
    Title:   View your payslip
    For:     Every employee
    Steps:   5
    Length:  53 s

07-add-employees.mp4
    Title:   Add and invite employees
    For:     Owner, Admin
    Steps:   8
    Length:  87 s

08-work-schedules.mp4
    Title:   Set up work schedules
    For:     Owner, Admin
    Steps:   5
    Length:  54 s

09-work-locations.mp4
    Title:   Set up work locations
    For:     Owner, Admin
    Steps:   5
    Length:  52 s

10-payout-schedule.mp4
    Title:   Set the payout schedule
    For:     Owner, Admin
    Steps:   6
    Length:  58 s

11-deduction-rules.mp4
    Title:   Set deduction rules
    For:     Owner, Admin
    Steps:   5
    Length:  55 s

12-run-payroll.mp4
    Title:   Run payroll
    For:     Owner, Admin
    Steps:   7
    Length:  69 s

13-monitor-team.mp4
    Title:   Monitor your team
    For:     Owner, Admin, Manager
    Steps:   5
    Length:  52 s

14-inbox.mp4
    Title:   Check your inbox
    For:     Everyone
    Steps:   4
    Length:  42 s

15-profile-security.mp4
    Title:   Profile, password and security
    For:     Everyone
    Steps:   6
    Length:  60 s

Total: 14 min 26 s
