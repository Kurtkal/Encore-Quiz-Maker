package apierr

import "encore.dev/beta/errs"

func Invalid(msg string) error {
	return errs.B().Code(errs.InvalidArgument).Msg(msg).Err()
}

func Unauthenticated(msg string) error {
	return errs.B().Code(errs.Unauthenticated).Msg(msg).Err()
}

func PermissionDenied(msg string) error {
	return errs.B().Code(errs.PermissionDenied).Msg(msg).Err()
}

func NotFound(msg string) error {
	return errs.B().Code(errs.NotFound).Msg(msg).Err()
}

func AlreadyExists(msg string) error {
	return errs.B().Code(errs.AlreadyExists).Msg(msg).Err()
}

func FailedPrecondition(msg string) error {
	return errs.B().Code(errs.FailedPrecondition).Msg(msg).Err()
}

func Internal(msg string, cause error) error {
	return errs.B().Code(errs.Internal).Msg(msg).Cause(cause).Err()
}
