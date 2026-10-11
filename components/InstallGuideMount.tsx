import type { Dictionary } from '@/lib/i18n'
import { InstallGuide } from './InstallGuide'

/** The add-to-home-screen guide with its texts in the reader's language. */
export function InstallGuideMount({ t }: { t: Dictionary }) {
  const i = t.install
  return (
    <InstallGuide
      labels={{
        title: i.title,
        lead: i.lead,
        steps: [i.step(1), i.step(2), i.step(3)],
        ios: [
          { title: i.iosShare, hint: i.iosShareHint },
          { title: i.iosAdd, hint: i.iosAddHint },
          { title: i.iosConfirm, hint: i.iosConfirmHint },
        ],
        android: [
          { title: i.androidMenu, hint: i.androidMenuHint },
          { title: i.androidAdd, hint: i.androidAddHint },
          { title: i.androidConfirm, hint: i.androidConfirmHint },
        ],
        doneTitle: i.doneTitle,
        menuAdd: i.menuAdd,
        menuCopy: i.menuCopy,
        menuBookmark: i.menuBookmark,
        add: i.add,
        install: i.install,
        installNow: i.installNow,
        next: i.next,
        back: i.back,
        gotIt: i.gotIt,
        later: i.later,
      }}
    />
  )
}
