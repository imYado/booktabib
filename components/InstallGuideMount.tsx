import type { Dictionary, Locale } from '@/lib/i18n'
import { InstallGuide } from './InstallGuide'

/** The add-to-home-screen guide with its texts in the reader's language. */
export function InstallGuideMount({ t, locale }: { t: Dictionary; locale: Locale }) {
  const i = t.install
  return (
    <InstallGuide
      locale={locale}
      labels={{
        title: i.title,
        ios: [
          { title: i.iosMore, hint: i.iosMoreHint },
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
        menuShare: i.menuShare,
        menuViewMore: i.menuViewMore,
        menuFavorite: i.menuFavorite,
        openAsApp: i.openAsApp,
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
