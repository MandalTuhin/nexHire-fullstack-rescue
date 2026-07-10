package com.nexhire.exception;

/** Generic 400 for domain/business-rule violations that aren't a state-transition or duplicate issue
 *  (e.g. incomplete candidate profile, batch capacity exceeded, missing HR employee mapping). */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
