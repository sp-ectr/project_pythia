from enum import Enum

class BundleId(str, Enum):
    BUNDLE_1 = "bundle_1"
    BUNDLE_5 = "bundle_5"
    BUNDLE_10 = "bundle_10"

    @property
    def tokens(self) -> int:
        return {
            BundleId.BUNDLE_1: 1,
            BundleId.BUNDLE_5: 5,
            BundleId.BUNDLE_10: 10,
        }[self]

    @property
    def stars(self) -> int:
        return {
            BundleId.BUNDLE_1: 99,
            BundleId.BUNDLE_5: 399,
            BundleId.BUNDLE_10: 699,
        }[self]